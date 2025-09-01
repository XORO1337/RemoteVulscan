#!/bin/bash

# Database Initialization Script for SQLite
# This script initializes the SQLite database for the vulnerability scanner

set -e

echo "🗄️  Initializing SQLite Database"
echo "================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Set database path
DB_PATH="${SQLITE_DB_PATH:-/data/db/custom.db}"
DB_DIR="$(dirname "$DB_PATH")"

# Create database directory
print_status "Creating database directory..."
mkdir -p "$DB_DIR"
chmod 755 "$DB_DIR"

# Initialize database with basic schema
print_status "Initializing database..."
sqlite3 "$DB_PATH" << 'EOF'
-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- Create tables if they don't exist
CREATE TABLE IF NOT EXISTS "Website" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL UNIQUE,
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Scan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "websiteId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "scanType" TEXT NOT NULL,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "errorMessage" TEXT,
    "results" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("websiteId") REFERENCES "Website" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "Vulnerability" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scanId" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "solution" TEXT,
    "reference" TEXT,
    "location" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("scanId") REFERENCES "Scan" ("id") ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_scan_website_id" ON "Scan" ("websiteId");
CREATE INDEX IF NOT EXISTS "idx_scan_status" ON "Scan" ("status");
CREATE INDEX IF NOT EXISTS "idx_scan_created_at" ON "Scan" ("createdAt");
CREATE INDEX IF NOT EXISTS "idx_vulnerability_scan_id" ON "Vulnerability" ("scanId");
CREATE INDEX IF NOT EXISTS "idx_vulnerability_severity" ON "Vulnerability" ("severity");

-- Insert some sample data for testing (optional)
INSERT OR IGNORE INTO "Website" ("id", "url", "name") VALUES 
    ('demo-1', 'https://example.com', 'Example Website'),
    ('demo-2', 'https://test.com', 'Test Website');

-- Create a view for scan statistics
CREATE VIEW IF NOT EXISTS "ScanStatistics" AS
SELECT 
    COUNT(*) as total_scans,
    SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_scans,
    SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed_scans,
    SUM(CASE WHEN status = 'RUNNING' THEN 1 ELSE 0 END) as running_scans,
    SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending_scans
FROM "Scan";

-- Create a view for vulnerability statistics
CREATE VIEW IF NOT EXISTS "VulnerabilityStatistics" AS
SELECT 
    COUNT(*) as total_vulnerabilities,
    SUM(CASE WHEN severity = 'CRITICAL' THEN 1 ELSE 0 END) as critical_count,
    SUM(CASE WHEN severity = 'HIGH' THEN 1 ELSE 0 END) as high_count,
    SUM(CASE WHEN severity = 'MEDIUM' THEN 1 ELSE 0 END) as medium_count,
    SUM(CASE WHEN severity = 'LOW' THEN 1 ELSE 0 END) as low_count,
    SUM(CASE WHEN severity = 'INFO' THEN 1 ELSE 0 END) as info_count
FROM "Vulnerability";

-- Create triggers for automatic timestamp updates
CREATE TRIGGER IF NOT EXISTS "update_website_updated_at" 
AFTER UPDATE ON "Website"
BEGIN
    UPDATE "Website" SET "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = NEW."id";
END;

CREATE TRIGGER IF NOT EXISTS "update_scan_updated_at" 
AFTER UPDATE ON "Scan"
BEGIN
    UPDATE "Scan" SET "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = NEW."id";
END;

-- Vacuum the database to optimize performance
VACUUM;

-- Analyze the database to update statistics
ANALYZE;

EOF

# Set proper permissions
chmod 644 "$DB_PATH"

# Verify database creation
if [ -f "$DB_PATH" ]; then
    print_success "Database initialized successfully!"
    print_status "Database location: $DB_PATH"
    print_status "Database size: $(du -h "$DB_PATH" | cut -f1)"
    
    # Verify tables
    print_status "Verifying database tables..."
    sqlite3 "$DB_PATH" ".tables"
    
    # Verify views
    print_status "Verifying database views..."
    sqlite3 "$DB_PATH" ".schema | grep VIEW"
    
    # Show record counts
    print_status "Database record counts:"
    sqlite3 "$DB_PATH" "SELECT 'Websites: ' || COUNT(*) FROM Website;"
    sqlite3 "$DB_PATH" "SELECT 'Scans: ' || COUNT(*) FROM Scan;"
    sqlite3 "$DB_PATH" "SELECT 'Vulnerabilities: ' || COUNT(*) FROM Vulnerability;"
    
else
    print_error "Database initialization failed!"
    exit 1
fi

# Create database backup script
print_status "Creating database backup script..."
cat > "${DB_DIR}/backup-db.sh" << 'EOF'
#!/bin/bash

# Database Backup Script
DB_PATH="$1"
BACKUP_DIR="${2:-$(dirname "$DB_PATH")/backups}"

if [ -z "$DB_PATH" ]; then
    echo "Usage: $0 <db_path> [backup_dir]"
    exit 1
fi

mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/backup-$(date +%Y%m%d_%H%M%S).db"

sqlite3 "$DB_PATH" ".backup $BACKUP_FILE"
echo "Database backed up to: $BACKUP_FILE"

# Keep only last 7 backups
find "$BACKUP_DIR" -name "*.db" -mtime +7 -delete
EOF

chmod +x "${DB_DIR}/backup-db.sh"

# Create database restore script
print_status "Creating database restore script..."
cat > "${DB_DIR}/restore-db.sh" << 'EOF'
#!/bin/bash

# Database Restore Script
BACKUP_FILE="$1"
DB_PATH="$2"

if [ -z "$BACKUP_FILE" ] || [ -z "$DB_PATH" ]; then
    echo "Usage: $0 <backup_file> <db_path>"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Backup file not found: $BACKUP_FILE"
    exit 1
fi

cp "$BACKUP_FILE" "$DB_PATH"
echo "Database restored from: $BACKUP_FILE"
EOF

chmod +x "${DB_DIR}/restore-db.sh"

print_success "Database initialization completed successfully!"
echo ""
echo "📋 Database Information:"
echo "   • Location: $DB_PATH"
echo "   • Size: $(du -h "$DB_PATH" | cut -f1)"
echo "   • Tables: Website, Scan, Vulnerability"
echo "   • Views: ScanStatistics, VulnerabilityStatistics"
echo "   • Indexes: Created for performance optimization"
echo ""
echo "🔧 Management Scripts:"
echo "   • Backup: ${DB_DIR}/backup-db.sh"
echo "   • Restore: ${DB_DIR}/restore-db.sh"
echo ""
echo "📊 Statistics Views Available:"
echo "   • ScanStatistics: Overview of all scans"
echo "   • VulnerabilityStatistics: Overview of all vulnerabilities"
echo ""
echo "🛡️  Security Features:"
echo "   • Foreign key constraints enabled"
echo "   • Proper indexing for performance"
echo "   • Automatic timestamp updates"
echo "   • Database optimization completed"
echo ""
