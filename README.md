# Lumin Consultancy Web Portal & Laboratory Management Platform (PHP & MySQL)

Production-ready PHP and Vanilla Web application providing laboratory marketing, ISO/IEC 17025:2017 & NABL accreditation guidance, consultation lead capture, automated SMTP notifications, and an administrative lead triage dashboard for **Lumin Consultancy**.

Converted from Spring Boot 3.3.5 to high-performance, modern PHP 8.x with the exact same frontend UI, styles, interactions, API contracts, and MySQL database structure.

---

## 🚀 Key Features Preserved & Enhanced
- **Identical Frontend UI & Styles**: Completely preserved HTML5, responsive CSS3 design system, particle background animations, and mobile drawer navigation.
- **Identical MySQL Database Schema**: Uses the exact same `enquiries` table structure, field names, and data types originally defined in the Spring Boot JPA entity.
- **Identical REST API Endpoints**:
  - `POST /api/enquiry`: Lead submission with Honeypot anti-spam defense, sliding-window rate limiting, MySQL persistence, and SMTP notification.
  - `GET /api/enquiries`: Triage lead list retrieval sorted by `createdAt DESC`.
  - `DELETE /api/enquiries/{id}`: Single lead permanent removal with 404/200 handling.
  - `GET /api/contact`: Configuration discovery endpoint.
- **Zero-Dependency Architecture**: Built using native PHP PDO, native OpenSSL sockets for SMTP/TLS relay, and standard libraries. Runs out of the box without requiring `composer install`.
- **Administrative Lead Dashboard**: Real-time client-side search, 30-minute inactivity auto-logout, 1-click WhatsApp/Phone/Email actions, and confirmation modals.

---

## 🛠️ Technical Stack & Architecture

- **Backend Runtime**: PHP 8.0+ (PDO, PDO_MySQL, OpenSSL, mbstring)
- **Database**: MySQL 8.0+ / MariaDB (`lumindb`)
- **Frontend**: HTML5, Vanilla CSS3 (Custom Variables), ES6+ JavaScript, `particles.js`
- **Web Server Compatibility**: Apache (with `.htaccess`), PHP Built-in Server (`router.php`), Nginx, XAMPP, WAMP, Laragon, or Docker.

---

## ⚙️ Configuration & Environment Variables

Configuration is loaded from environment variables or a local `.env` file (copied from `.env.example`). Defaults replicate the original Spring Boot settings:

| Variable | Description | Default / Example |
|---|---|---|
| `PORT` | Local web server port | `8080` |
| `DB_HOST` / `MYSQLHOST` | MySQL hostname | `localhost` |
| `DB_PORT` / `MYSQLPORT` | MySQL port | `3306` |
| `DB_NAME` / `MYSQLDATABASE` | Database name | `lumindb` |
| `DB_USER` / `MYSQLUSER` | Database username | `root` |
| `DB_PASS` / `MYSQLPASSWORD` | Database password | `root` |
| `MYSQL_URL` | Cloud / Railway MySQL connection string | *(Optional, e.g., `mysql://user:pass@host:port/db`)* |
| `ENQUIRY_TO` | Target executive inbox receiving lead alerts | `ceo.lumin@gmail.com` |
| `SMTP_HOST` | Outbound SMTP relay host | `smtp.gmail.com` |
| `SMTP_PORT` | Outbound SMTP port | `587` |
| `SMTP_USER` | Originating email address for SMTP | *(Your Gmail or SMTP email)* |
| `SMTP_PASS` | Gmail App Password or SMTP password | *(16-character App Password)* |
| `SMTP_SECURE` | Transport layer security | `tls` |

---

## 📦 Database Setup (MySQL)

### Option A: Automatic Initialization
The PHP application includes auto-provisioning logic (replicating Spring Boot's `createDatabaseIfNotExist=true` and Hibernate `ddl-auto=update`). When MySQL is running, visiting the application will automatically create the `lumindb` database and `enquiries` table if they do not already exist.

### Option B: Manual SQL Import
You can also import `schema.sql` via MySQL CLI or phpMyAdmin:
```bash
mysql -u root -p < schema.sql
```

---

## 🏃 Quick Start (Running Locally)

### Method 1: Using PHP's Built-in Development Server (Recommended)
1. Open PowerShell / Terminal in the project root:
   ```bash
   cd "d:\subbu\Final Projects\lumin-site"
   ```
2. Start the built-in server with the provided router:
   ```bash
   php -S localhost:8080 router.php
   ```
3. Open your browser:
   - **Public Portal**: [http://localhost:8080/](http://localhost:8080/)
   - **Visual Gallery**: [http://localhost:8080/gallery.html](http://localhost:8080/gallery.html)
   - **Administrative Dashboard**: [http://localhost:8080/admin.html](http://localhost:8080/admin.html) *(Credentials: `Lumin_admin` / `Veda@789`)* 

---

### Method 2: Using XAMPP / WAMP / Apache
1. Copy or move this folder into your web server's root directory:
   - **XAMPP**: `C:\xampp\htdocs\lumin-site`
   - **WAMP**: `C:\wamp64\www\lumin-site`
2. Start **Apache** and **MySQL** in the XAMPP / WAMP Control Panel.
3. Access the site:
   - Public Portal: `http://localhost/lumin-site/`
   - Admin Dashboard: `http://localhost/lumin-site/admin.html`

---

### Method 3: Using Docker & Docker Compose
1. Ensure Docker is installed and running.
2. Build and start the containerized stack (PHP 8.2 + Apache & MySQL 8.0):
   `ash
   docker compose up -d
   `
3. Access the application:
   - **Public Portal**: [http://localhost:8080/](http://localhost:8080/)
   - **Administrative Dashboard**: [http://localhost:8080/admin.html](http://localhost:8080/admin.html) *(Credentials: Lumin_admin / Veda@789)*
4. To stop the containers:
   `ash
   docker compose down
   `

---

## 🌐 API Reference

### 1. Submit Consultation Enquiry
- **Endpoint**: `POST /api/enquiry`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "name": "Dr. Rajesh Sharma",
    "organization": "Apex Quality Testing Labs",
    "designation": "Director of Quality",
    "email": "rajesh@apexlab.com",
    "phone": "+91 98765 43210",
    "sector": "Pharmaceutical & Healthcare",
    "service": "ISO/IEC 17025:2017 Full Accreditation",
    "status": "Ready for Pre-Audit",
    "message": "We need comprehensive consulting for our microbiology facility.",
    "preferred": "WhatsApp",
    "website": ""
  }
  ```
- **Responses**:
  - `200 OK`: `{"success": true}`
  - `400 Bad Request`: `{"success": false, "error": "Please complete all required fields with valid details."}`
  - `429 Too Many Requests`: `{"success": false, "error": "Too many enquiries. Please try again later."}`

### 2. Fetch All Enquiries (Admin)
- **Endpoint**: `GET /api/enquiries`
- **Response**: Array of enquiry records sorted by creation date descending.

### 3. Delete Enquiry (Admin)
- **Endpoint**: `DELETE /api/enquiries/{id}`
- **Responses**:
  - `200 OK`: `{"success": true, "message": "Enquiry deleted successfully"}`
  - `404 Not Found`: `{"success": false, "error": "Enquiry not found"}`

---

## 🔒 Security Best Practices Implemented
- **SQL Injection Prevention**: 100% prepared PDO statements with parameterized query binding.
- **Cross-Site Scripting (XSS)**: Safe output escaping (`escapeHtml()`) across client views.
- **Anti-Bot Honeypot**: Hidden `website` input field traps automated spam scrapers silently.
- **Sliding-Window IP Rate Limiting**: Caps submissions to 5 per IP address per hour.
- **Email Header Injection Defense**: Carriage returns and line feed stripping on email subjects and headers.
# lumin
# lumin
# luminConsultancy
