<?php
/**
 * POST /api/enquiry
 * Processes incoming consultation enquiry submissions from the public website form.
 * Replicates EnquiryController.submit()
 */

// Buffer all output to prevent any notices or warnings from corrupting JSON
ob_start();

// Suppress raw HTML error display in API output (errors are written to server log instead)
ini_set('display_errors', '0');
error_reporting(E_ALL);

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    ob_end_clean();
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ob_end_clean();
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method Not Allowed']);
    exit;
}

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/RateLimiter.php';
require_once __DIR__ . '/Mailer.php';

// Parse inbound JSON payload
$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);

// If not valid JSON, check standard form POST
if (!is_array($data)) {
    $data = $_POST;
}

// 1. Anti-spam honeypot verification (real visitors leave empty, bots populate it)
$website = trim($data['website'] ?? ($data['_honey'] ?? ''));
if ($website !== '') {
    ob_end_clean();
    echo json_encode(['success' => true]);
    exit;
}

// Establish DB connection
try {
    $pdo = Database::getConnection();
} catch (Throwable $e) {
    error_log("Database connection error in enquiry.php: " . $e->getMessage());
    ob_end_clean();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => 'We could not save your enquiry right now. Please try again shortly.'
    ]);
    exit;
}

// 2. IP Rate Limiting (Sliding-window: max 5 requests per hour)
$clientIp = RateLimiter::getClientIp();
if (RateLimiter::isRateLimited($clientIp, $pdo)) {
    ob_end_clean();
    http_response_code(429);
    echo json_encode([
        'success' => false,
        'error'   => 'Too many enquiries. Please try again later.'
    ]);
    exit;
}

// 3. Declarative Validation (matching EnquiryRequest.java)
$name         = trim($data['name'] ?? '');
$organization = trim($data['organization'] ?? '');
$designation  = trim($data['designation'] ?? '');
$email        = trim($data['email'] ?? '');
$phone        = trim($data['phone'] ?? '');

// Normalize Indian phone numbers: ensure standard +91 international dialing format
$cleanDigits = preg_replace('/\D/', '', $phone);
if (strlen($cleanDigits) === 10) {
    $phone = '+91 ' . $cleanDigits;
} elseif (strlen($cleanDigits) === 11 && str_starts_with($cleanDigits, '0')) {
    $phone = '+91 ' . substr($cleanDigits, 1);
} elseif (strlen($cleanDigits) === 12 && str_starts_with($cleanDigits, '91')) {
    $phone = '+91 ' . substr($cleanDigits, 2);
} elseif (!str_starts_with($phone, '+') && strlen($cleanDigits) >= 10) {
    $phone = '+91 ' . $cleanDigits;
}
$sector       = trim($data['sector'] ?? '');
$service      = trim($data['service'] ?? '');
$status       = trim($data['status'] ?? '');
$message      = trim($data['message'] ?? '');
$preferred    = trim($data['preferred'] ?? '');

// 3. Mandatory (* fields) validation: Name, Organization, Email, Phone
if ($name === '' || mb_strlen($name) > 120) {
    ob_end_clean();
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Please enter your Name.']);
    exit;
}

if ($organization === '' || mb_strlen($organization) > 160) {
    ob_end_clean();
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Please enter your Organization or Laboratory name.']);
    exit;
}

if ($email === '' || mb_strlen($email) > 160 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    ob_end_clean();
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Please enter a valid Email address with domain extension (e.g., yourname@gmail.com).']);
    exit;
}

if ($phone === '' || mb_strlen($phone) > 40) {
    ob_end_clean();
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Please enter a valid Phone number.']);
    exit;
}

// 4. Non-* optional fields: completely optional (blank or filled is 100% allowed)
$designation  = mb_substr($designation, 0, 120);
$sector       = mb_substr($sector, 0, 120);
$service      = mb_substr($service, 0, 120);
$status       = mb_substr($status, 0, 120);
$message      = mb_substr($message, 0, 3000);
$preferred    = mb_substr($preferred, 0, 40);

// 4. Persist enquiry into MySQL database
try {
    $stmt = $pdo->prepare("
        INSERT INTO enquiries (name, organization, designation, email, phone, sector, service, status, message, preferred, created_at)
        VALUES 
        (:name, :org, :desig, :email, :phone, :sector, :service, :status, :message, :pref, NOW())
    ");

    $stmt->execute([
        ':name'    => $name,
        ':org'     => $organization,
        ':desig'   => $designation !== '' ? $designation : null,
        ':email'   => $email,
        ':phone'   => $phone,
        ':sector'  => $sector !== '' ? $sector : null,
        ':service' => $service !== '' ? $service : null,
        ':status'  => $status !== '' ? $status : null,
        ':message' => $message !== '' ? $message : null,
        ':pref'    => $preferred !== '' ? $preferred : null,
    ]);

    $insertId = (int)$pdo->lastInsertId();
    error_log("Enquiry successfully recorded with ID: {$insertId}");
} catch (Throwable $e) {
    error_log("Failed to save enquiry to MySQL: " . $e->getMessage());
    ob_end_clean();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => 'We could not save your enquiry right now. Please try again shortly.'
    ]);
    exit;
}

// 5. Send Email notification in safe try-catch so SMTP failure never breaks user submission
try {
    Mailer::sendEnquiry([
        'id'           => $insertId,
        'name'         => $name,
        'organization' => $organization,
        'designation'  => $designation,
        'email'        => $email,
        'phone'        => $phone,
        'sector'       => $sector,
        'service'      => $service,
        'status'       => $status,
        'message'      => $message,
        'preferred'    => $preferred,
    ]);
} catch (Throwable $e) {
    error_log("Enquiry #{$insertId} saved to database, but email delivery failed: " . $e->getMessage());
}

// 6. Return pure success JSON response
ob_end_clean();
echo json_encode(['success' => true]);
exit;
