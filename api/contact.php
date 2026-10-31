<?php
/**
 * GET /api/contact
 * Exposes the primary recipient email configured for the consultancy.
 * Replicates EnquiryController.contact()
 */

ob_start();
ini_set('display_errors', '0');
error_reporting(E_ALL);

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    ob_end_clean();
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    ob_end_clean();
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method Not Allowed']);
    exit;
}

$config = require __DIR__ . '/../config/config.php';
$recipient = $config['mail']['to'] ?? 'ceo.lumin@gmail.com';

ob_end_clean();
echo json_encode(['email' => $recipient], JSON_UNESCAPED_SLASHES);
