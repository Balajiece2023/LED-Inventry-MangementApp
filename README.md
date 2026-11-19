# 💡 Leo Force | LED Manufacturing Management System (MMS)

A modern, enterprise-grade Manufacturing Execution System (MES / ERP) designed specifically for an **LED Light Manufacturing and Assembly Company**.

Built with **React, TypeScript, Tailwind CSS, Node.js, Express, PostgreSQL, and Prisma ORM**, featuring strict Role-Based Access Control (RBAC), Material Reservation logic, Shop Floor Assembly Tracking, QC Lab testing with automated PDF Certificate generation, and Dispatch fulfillment with Delivery Notes.

---

## 🚀 Live Services & Local Access

| Service | Local Address | Description |
| :--- | :--- | :--- |
| **Frontend Web App** | [http://localhost:5173](http://localhost:5173) | Responsive React + TypeScript Enterprise UI |
| **Backend REST API** | [http://localhost:5001](http://localhost:5001) | Node.js + Express + TypeScript API |
| **API Health Check** | [http://localhost:5001/api/health](http://localhost:5001/api/health) | Live Server & Database Status |

---

## 👥 Pre-Configured Enterprise Roles & Test Accounts

You can log in manually using the credentials below, or click any role in the **1-Click Quick Role Switcher** inside the app navbar or login screen:

| Role | Email | Password | Access & Responsibilities |
| :--- | :--- | :--- | :--- |
| **1. Admin** | `admin@ledmfg.com` | `admin123` | **Full access**: Master KPI dashboard, user management, products, inventory, production, QC, dispatch, audit logs. |
| **2. Store Keeper** | `store@ledmfg.com` | `store123` | **Inventory only**: Raw materials inward receipts, physical stock adjustments, low stock alerts, stock ledger. |
| **3. Production Supervisor** | `supervisor@ledmfg.com` | `super123` | **Production & Assembly**: BOM calculations, production order creation, order lock & material reservations, 6-stage assembly tracking. |
| **4. QC Engineer** | `qc@ledmfg.com` | `qc123` | **Testing & Conformance**: Electrical parameter testing (V, A, W, Temp), burn-in aging racks, pass/fail tagging, auto PDF QC certificate issuance. |
| **5. Dispatch Team** | `dispatch@ledmfg.com` | `dispatch123` | **Finished Goods & Logistics**: Finished goods inventory, customer order booking, stock availability verification, dispatch fulfillment, PDF dispatch notes. |

---

## 🛠️ Complete Feature Walkthrough

### 1. Authentication & Role-Based Access Control (RBAC)
- Secure JWT authentication with bcrypt password hashing.
- Route protection middleware enforcing role permissions on both frontend and backend.
- Persistent sessions and quick role switching for seamless auditing across roles.

### 2. Product Master Module
- Manage LED luminaire models:
  - **Sample Models**: `LED-12W-WHITE` (12W Cool White LED Bulb), `LED-9W-WARM`, `LED-18W-PANEL`, `LED-24W-STREET`, `LED-50W-FLOOD`, `LED-40W-BATTEN`.
  - Rated wattage, technical specifications, and active/inactive status.
  - Linked directly to BOM definitions and finished goods inventory.

### 3. Raw Material Master & Stock Ledger
- Comprehensive component catalog:
  - **LED Chips**: SMD 2835 (6500K), SMD 3030 (1W High Power).
  - **Constant Current Drivers**: 12W, 9W, 18W, 50W IP67 Waterproof.
  - **MCPCBs**: Circular aluminum boards, panel boards.
  - **Mechanics**: Die-cast aluminum heatsinks, polycarbonate housings (B22/E27).
  - **Hardware & Passive**: Stainless M3 screws, silicone wire 24AWG, electrolytic capacitors 400V, thermal paste, retail boxes.
- **Stock Calculations**:
  - `Available Stock = Physical Current Stock - Reserved Stock`.
- **Features**:
  - **Goods Receipt Inward**: Increase stock with supplier and GRN reference.
  - **Physical Count Adjustment**: Audit variances with audit transaction logging.
  - **Low Stock Alerts**: Instant trigger when available stock drops below reorder threshold.
  - **Stock Movement Ledger**: Complete chronological ledger of every Inward, Reserved, Unreserved, Issued, and Consumed transaction.

### 4. Bill of Materials (BOM) & Live Shortage Calculator
- Multi-component recipe per finished luminaire unit.
- Versioning support (`v1.0`, `v1.1`, `v2.0`).
- **Interactive Batch Calculator**: Enter batch size (e.g., 100, 200, 500 units) to instantly calculate:
  - Exact components required.
  - Total estimated material cost.
  - Shortage analysis highlighting component shortages before scheduling production.

### 5. Production Orders & Material Reservation Logic
- Production order creation with automated BOM component calculation.
- **Strict Reservation Logic**:
  - When an order is **LOCKED**: Stock is **NOT** immediately deleted. It transitions from `Available Stock` to `Reserved Stock` in the database.
  - If an order is **CANCELLED**: Reserved stock is automatically released back to `Available Stock`.
  - Transaction logs (`RESERVED` / `UNRESERVED`) are generated for auditability.
  - When assembly starts: Reserved stock is permanently consumed and issued to line workers.

### 6. Assembly Line Tracking (6 Milestones)
Visual Kanban and progress tracking across 6 manufacturing stages:
1. `MATERIAL_ISSUED`: Store issued components to assembly line.
2. `ASSEMBLY_STARTED`: SMT chip mounting & driver soldering.
3. `ASSEMBLY_COMPLETED`: Heatsink fixing and core assembly.
4. `TESTING`: 4-hour continuous aging burn-in rack load test.
5. `PACKING`: Retail box and master carton packing.
6. `FINISHED`: Batch completed and ready for QC certification.

### 7. QC Testing Module & Automatic PDF Certificate Generation
- QC Engineer tests active batches:
  - **Input parameters**: AC Voltage (V), Operating Current (A), Power Draw (W), Heat Sink Temperature (°C), Burn-In Duration.
  - **Decision**: `PASS` or `FAIL`.
  - **Failure Classification**: Driver Failure, PCB Fault, LED Fault, Assembly Defect, Other.
- **Automatic Conformance Certificate**:
  - When `PASS` is recorded, a unique Certificate Number (`QCC-2026-XXX`) is automatically generated.
  - Products automatically move into Finished Goods Inventory.
  - **1-Click PDF Download**: Generates official branded quality certificates using `jsPDF` and `AutoTable`.

### 8. Finished Goods Warehouse Inventory
- Only batches that have **PASSED** QC testing appear here.
- Tracks Batch Number, Model, Total Quantity, Reserved Quantity, and Available Quantity.
- Real-time KPI cards for Available Finished Goods, Committed Orders, and Quarantined Rejections.

### 9. Dispatch Management & Delivery Notes
- Dispatch team books customer orders against commercial invoices.
- **Availability Verification**: Prevents overbooking beyond available finished goods stock.
- **Dispatch Action**:
  - Deducts physical inventory from Finished Goods batches (FIFO).
  - Updates order status to `DISPATCHED`.
  - Generates downloadable official **Dispatch / Delivery Note PDF** with customer consignee details and authorized signatures.

### 10. Reports & Analytics
- **Daily Assembled Output**: 7-day shop floor trend.
- **Monthly Targets vs Actuals**: Milestone tracking.
- **Inventory Consumption by Component Group**: Material cost breakdown.
- **QC Defect Pareto Analysis**: Root cause identification for failed batches.
- **Assembly Line OEE Matrix**: Efficiency and productivity ratings.
- **Exporting**: 1-click Excel (`.xlsx`) and CSV exports on all datasets.

### 11. Real-Time Notifications
- Low stock threshold alerts.
- Material shortage warnings.
- QC testing failure notifications.
- Pending dispatch orders.
- Unread badge counters and mark-as-read controls.

### 12. Complete Audit Trail
- Stores: `User`, `Timestamp`, `Action`, `Module`, `Details`, and `IP Address`.
- Filter by module and search across compliance events.

---

## 🗄️ Database Architecture (PostgreSQL + Prisma)

The PostgreSQL database (`led_mfg_db`) contains the following schema:
- `users`: Operator profiles and RBAC credentials.
- `products`: Finished LED light models, wattages, descriptions.
- `materials`: Raw materials catalog, physical stock, reserved stock, unit cost, reorder levels.
- `bom` & `bom_items`: Recipes linking products to raw material component requirements.
- `production_orders` & `production_order_materials`: Production batch runs and component allocations.
- `inventory_transactions`: Complete stock ledger (INWARD, RESERVED, UNRESERVED, CONSUMED, ADJUSTMENT).
- `qc_reports`: Voltage, current, power, temperature, burn-in duration, and pass/fail verdicts.
- `qc_certificates`: Conformance certificates linked to passed QC inspection reports.
- `finished_goods`: Certified finished luminaire stock in warehouse.
- `dispatch_orders`: Consignee customer shipments and delivery tracking.
- `notifications`: System alerts and action requests.
- `audit_logs`: Immutable compliance audit trail.

---

## 💻 Tech Stack Summary

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts, jsPDF, jsPDF-AutoTable, SheetJS (`xlsx`).
- **Backend**: Node.js, Express, TypeScript, Prisma ORM, JSON Web Tokens (JWT), Bcrypt.js, CORS.
- **Database**: PostgreSQL 18 (Local database: `led_mfg_db`).
- **Theme**: Dark and Light theme toggle with local storage persistence.
- **Export**: Native Excel (.xlsx), CSV, and PDF generators.
