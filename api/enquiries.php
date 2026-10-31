<?php
/**
 * /api/enquiries
 *
 * GET: Retrieves all consultation enquiries sorted by created_at DESC (Replicates EnquiryController.getEnquiries)
 * DELETE: Permanently deletes an enquiry by ID (Replicates EnquiryController.deleteEnquiry)
 */

ob_start();
ini_set('display_errors', '0');
error_reporting(E_ALL);

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    ob_end_clean();
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../config/db.php';

try {
    $pdo = Database::getConnection();
} catch (Throwable $e) {
    ob_end_clean();
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

// -------------------------------------------------------------------
// GET: Fetch all enquiry records sorted by creation date descending
// -------------------------------------------------------------------
if ($method === 'GET') {
    try {
        $stmt = $pdo->query("
            SELECT 
                `id`,
                `name`,
                `organization`,
                `designation`,
                `email`,
                `phone`,
                `sector`,
                `service`,
                `status`,
                `message`,
                `preferred`,
                `created_at`
            FROM `enquiries`
            ORDER BY `created_at` DESC, `id` DESC
        ");

        $rows = $stmt->fetchAll();
        $enquiries = [];

        foreach ($rows as $row) {
            // Format timestamp into ISO 8601 UTC string (matches Spring Boot Jackson Instant serialization)
            $rawTime = $row['created_at'];
            $timestamp = !empty($rawTime) ? strtotime($rawTime) : time();
            $isoDate = gmdate('Y-m-d\TH:i:s\Z', $timestamp);

            $enquiries[] = [
                'id'           => (int)$row['id'],
                'name'         => $row['name'] ?? '',
                'organization' => $row['organization'] ?? '',
                'designation'  => $row['designation'],
                'email'        => $row['email'] ?? '',
                'phone'        => $row['phone'] ?? '',
                'sector'       => $row['sector'],
                'service'      => $row['service'],
                'status'       => $row['status'],
                'message'      => $row['message'],
                'preferred'    => $row['preferred'],
                'createdAt'    => $isoDate,
                'created_at'   => $row['created_at'],
            ];
        }

        ob_end_clean();
        echo json_encode($enquiries, JSON_UNESCAPED_SLASHES);
        exit;
    } catch (Throwable $e) {
        ob_end_clean();
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to fetch enquiries: ' . $e->getMessage()]);
        exit;
    }
}

// -------------------------------------------------------------------
// DELETE: Remove record by ID (/api/enquiries/{id} or /api/enquiries?id={id})
// -------------------------------------------------------------------
if ($method === 'DELETE') {
    $id = isset($GLOBALS['routeId']) ? (int)$GLOBALS['routeId'] : (int)($_GET['id'] ?? 0);

    if ($id <= 0) {
        $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        if (preg_match('#/enquiries/(\d+)#', $uri, $matches)) {
            $id = (int)$matches[1];
        }
    }

    if ($id <= 0) {
        ob_end_clean();
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid or missing enquiry ID']);
        exit;
    }

    try {
        $checkStmt = $pdo->prepare("SELECT `id` FROM `enquiries` WHERE `id` = :id LIMIT 1");
        $checkStmt->execute([':id' => $id]);
        if (!$checkStmt->fetch()) {
            ob_end_clean();
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Enquiry not found']);
            exit;
        }

        $delStmt = $pdo->prepare("DELETE FROM `enquiries` WHERE `id` = :id LIMIT 1");
        $delStmt->execute([':id' => $id]);

        ob_end_clean();
        echo json_encode(['success' => true, 'message' => 'Enquiry deleted successfully']);
        exit;
    } catch (Throwable $e) {
        ob_end_clean();
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to delete enquiry: ' . $e->getMessage()]);
        exit;
    }
}

ob_end_clean();
http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Method Not Allowed']);
