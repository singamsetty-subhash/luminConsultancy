<?php
/**
 * Lumin Consultancy - Notification Mail Service
 * Replaces Spring Mail (JavaMailSender) with zero-dependency native SMTP & mail() delivery.
 * Supports TLS/STARTTLS on port 587, SSL on port 465, and Header Injection Protection.
 */

class Mailer {
    /**
     * Sends consultation enquiry notification email.
     *
     * @param array $data Validated enquiry payload
     * @return bool True if sent or gracefully handled, false on failure
     */
    public static function sendEnquiry(array $data): bool {
        $config = require __DIR__ . '/../config/config.php';
        $mailConfig = $config['mail'];

        $to = $mailConfig['to'];
        $from = $mailConfig['username'];
        $host = $mailConfig['host'];
        $port = $mailConfig['port'];
        $pass = $mailConfig['password'];
        $timeout = $mailConfig['timeout'] ?? 8;

        $clientEmail = trim($data['email'] ?? '');
        $clientName  = self::cleanHeader($data['name'] ?? 'Prospective Client');
        $orgName     = self::cleanHeader($data['organization'] ?? 'Testing Facility');

        $subject = "New website enquiry from {$clientName} ({$orgName})";

        $body = "New enquiry from the Lumin Consultancy website\n\n"
              . "Name:                 " . ($data['name'] ?? '-') . "\n"
              . "Organization:         " . ($data['organization'] ?? '-') . "\n"
              . "Designation:          " . (!empty($data['designation']) ? $data['designation'] : '-') . "\n"
              . "Email:                " . ($data['email'] ?? '-') . "\n"
              . "Phone:                " . ($data['phone'] ?? '-') . "\n"
              . "Laboratory sector:    " . (!empty($data['sector']) ? $data['sector'] : '-') . "\n"
              . "Service required:     " . (!empty($data['service']) ? $data['service'] : '-') . "\n"
              . "Accreditation status: " . (!empty($data['status']) ? $data['status'] : '-') . "\n"
              . "Preferred contact:    " . (!empty($data['preferred']) ? $data['preferred'] : '-') . "\n\n"
              . "Message:\n"
              . (!empty($data['message']) ? $data['message'] : '-') . "\n";

        // If SMTP credentials not provided, log and gracefully skip (matching MailService.java line 74)
        if (empty($from) || empty($pass)) {
            error_log("SMTP credentials not configured. Skipping live email dispatch for enquiry from: {$clientEmail}");
            return true;
        }

        // Attempt direct native socket SMTP dispatch
        try {
            return self::sendViaSmtp($host, $port, $from, $pass, $to, $clientEmail, $subject, $body, $timeout);
        } catch (Exception $e) {
            error_log("SMTP Socket error: " . $e->getMessage() . ". Attempting fallback to PHP mail()...");
            // Fallback to PHP native mail()
            return self::sendViaNativeMail($to, $from, $clientEmail, $subject, $body);
        }
    }

    /**
     * Native RFC-5321 socket implementation for outbound SMTP/TLS relay without external libraries.
     */
    private static function sendViaSmtp(
        string $host, int $port, string $user, string $pass,
        string $to, string $replyTo, string $subject, string $body, int $timeout
    ): bool {
        $context = stream_context_create([
            'ssl' => [
                'verify_peer' => false,
                'verify_peer_name' => false,
                'allow_self_signed' => true
            ]
        ]);

        $remote = ($port === 465 ? "ssl://$host:$port" : "tcp://$host:$port");
        $socket = @stream_socket_client($remote, $errno, $errstr, $timeout, STREAM_CLIENT_CONNECT, $context);

        if (!$socket) {
            throw new Exception("Could not connect to SMTP server $host:$port ($errno: $errstr)");
        }

        stream_set_timeout($socket, $timeout);

        self::expectReply($socket, [220]);
        self::sendCommand($socket, "EHLO " . gethostname());
        self::expectReply($socket, [250]);

        // If port 587, initiate STARTTLS
        if ($port === 587) {
            self::sendCommand($socket, "STARTTLS");
            self::expectReply($socket, [220]);
            if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                throw new Exception("STARTTLS negotiation failed");
            }
            self::sendCommand($socket, "EHLO " . gethostname());
            self::expectReply($socket, [250]);
        }

        // Authentication
        self::sendCommand($socket, "AUTH LOGIN");
        self::expectReply($socket, [334]);
        self::sendCommand($socket, base64_encode($user));
        self::expectReply($socket, [334]);
        self::sendCommand($socket, base64_encode($pass));
        self::expectReply($socket, [235]);

        // Envelope
        self::sendCommand($socket, "MAIL FROM:<$user>");
        self::expectReply($socket, [250]);
        self::sendCommand($socket, "RCPT TO:<$to>");
        self::expectReply($socket, [250, 251]);

        // Message content
        self::sendCommand($socket, "DATA");
        self::expectReply($socket, [354]);

        $headers = [
            "From: Lumin Web Lead <$user>",
            "To: <$to>",
            "Reply-To: <$replyTo>",
            "Subject: $subject",
            "MIME-Version: 1.0",
            "Content-Type: text/plain; charset=UTF-8",
            "Content-Transfer-Encoding: 8bit",
            "Date: " . date('r'),
            "X-Mailer: Lumin-PHP-Mailer/1.0"
        ];

        $payload = implode("\r\n", $headers) . "\r\n\r\n" . self::normalizeBody($body) . "\r\n.";
        self::sendCommand($socket, $payload);
        self::expectReply($socket, [250]);

        self::sendCommand($socket, "QUIT");
        fclose($socket);
        return true;
    }

    /**
     * Fallback to native PHP mail() function
     */
    private static function sendViaNativeMail(string $to, string $from, string $replyTo, string $subject, string $body): bool {
        $headers = [
            "From: Lumin Web Lead <$from>",
            "Reply-To: <$replyTo>",
            "MIME-Version: 1.0",
            "Content-Type: text/plain; charset=UTF-8",
            "X-Mailer: Lumin-PHP-Mailer/1.0"
        ];
        return @mail($to, $subject, $body, implode("\r\n", $headers));
    }

    private static function sendCommand($socket, string $cmd): void {
        fwrite($socket, $cmd . "\r\n");
    }

    private static function expectReply($socket, array $expectedCodes): string {
        $response = '';
        while ($line = fgets($socket, 512)) {
            $response .= $line;
            if (substr($line, 3, 1) === ' ') {
                break;
            }
        }
        $code = (int)substr($response, 0, 3);
        if (!in_array($code, $expectedCodes, true)) {
            throw new Exception("Unexpected SMTP response ($code): " . trim($response));
        }
        return $response;
    }

    /** Strip carriage returns and line feeds to prevent header injection */
    private static function cleanHeader(string $str): string {
        return trim(preg_replace('/[\r\n]+/', ' ', $str));
    }

    /** Ensure lines starting with dot are doubled (dot-stuffing) for SMTP */
    private static function normalizeBody(string $str): string {
        $str = str_replace(["\r\n", "\r"], "\n", $str);
        $lines = explode("\n", $str);
        foreach ($lines as &$line) {
            if (str_starts_with($line, '.')) {
                $line = '.' . $line;
            }
        }
        return implode("\r\n", $lines);
    }
}
