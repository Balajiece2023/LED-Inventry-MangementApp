import { PrismaClient, Role, ProductStatus, OrderStatus, AssemblyStage, TransactionType, QCResult, FailureReason, DispatchStatus, NotificationType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed for LED Manufacturing Management System...');

  // Clean existing tables in reverse dependency order
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.dispatchOrder.deleteMany();
  await prisma.finishedGoods.deleteMany();
  await prisma.qCCertificate.deleteMany();
  await prisma.qCReport.deleteMany();
  await prisma.inventoryTransaction.deleteMany();
  await prisma.productionOrderMaterial.deleteMany();
  await prisma.productionOrder.deleteMany();
  await prisma.bOMItem.deleteMany();
  await prisma.bOM.deleteMany();
  await prisma.material.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleaned existing tables.');

  // 1. Seed Users
  const hashedPasswordAdmin = await bcrypt.hash('admin123', 10);
  const hashedPasswordStore = await bcrypt.hash('store123', 10);
  const hashedPasswordSupervisor = await bcrypt.hash('super123', 10);
  const hashedPasswordQC = await bcrypt.hash('qc123', 10);
  const hashedPasswordDispatch = await bcrypt.hash('dispatch123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@ledmfg.com',
      password: hashedPasswordAdmin,
      name: 'Arthur Vance (Admin)',
      role: Role.ADMIN,
      phone: '+1 800 555 0101',
    },
  });

  const storeKeeper = await prisma.user.create({
    data: {
      email: 'store@ledmfg.com',
      password: hashedPasswordStore,
      name: 'Devin Cole (Store Keeper)',
      role: Role.STORE_KEEPER,
      phone: '+1 800 555 0102',
    },
  });

  const supervisor = await prisma.user.create({
    data: {
      email: 'supervisor@ledmfg.com',
      password: hashedPasswordSupervisor,
      name: 'Marcus Vance (Production Supervisor)',
      role: Role.PRODUCTION_SUPERVISOR,
      phone: '+1 800 555 0103',
    },
  });

  const qcEngineer = await prisma.user.create({
    data: {
      email: 'qc@ledmfg.com',
      password: hashedPasswordQC,
      name: 'Elena Rostova (QC Engineer)',
      role: Role.QC_ENGINEER,
      phone: '+1 800 555 0104',
    },
  });

  const dispatchTeam = await prisma.user.create({
    data: {
      email: 'dispatch@ledmfg.com',
      password: hashedPasswordDispatch,
      name: 'Liam Zhang (Dispatch Lead)',
      role: Role.DISPATCH_TEAM,
      phone: '+1 800 555 0105',
    },
  });

  console.log('✅ Users seeded successfully.');

  // 2. Seed Products
  const prod12w = await prisma.product.create({
    data: {
      modelNumber: 'LED-12W-WHITE',
      productName: '12W Cool White LED Bulb',
      wattage: 12,
      description: 'High efficiency 12W LED bulb with 1200 lumens output, B22 / E27 base, 6500K color temperature, 25,000h lifespan.',
      status: ProductStatus.ACTIVE,
    },
  });

  const prod9w = await prisma.product.create({
    data: {
      modelNumber: 'LED-9W-WARM',
      productName: '9W Warm White LED Bulb',
      wattage: 9,
      description: 'Energy-saving 9W LED bulb with 850 lumens output, 3000K soft warm glow, ideal for residential lighting.',
      status: ProductStatus.ACTIVE,
    },
  });

  const prod18w = await prisma.product.create({
    data: {
      modelNumber: 'LED-18W-PANEL',
      productName: '18W Slim Round Downlight Panel',
      wattage: 18,
      description: 'Architectural ultra-slim recessed panel with edge-lit technology, anti-glare diffuser, 1600 lumens.',
      status: ProductStatus.ACTIVE,
    },
  });

  const prod24w = await prisma.product.create({
    data: {
      modelNumber: 'LED-24W-STREET',
      productName: '24W Eco Street Light Fixture',
      wattage: 24,
      description: 'IP66 waterproof street light fitting with surge protection 4kV, toughened glass, high optical transmittance.',
      status: ProductStatus.ACTIVE,
    },
  });

  const prod50w = await prisma.product.create({
    data: {
      modelNumber: 'LED-50W-FLOOD',
      productName: '50W Heavy Duty Outdoor Flood Light',
      wattage: 50,
      description: 'Commercial grade 5000 lumen IP65 flood light, die-cast aluminum enclosure, adjustable bracket, 120° beam angle.',
      status: ProductStatus.ACTIVE,
    },
  });

  const prod40w = await prisma.product.create({
    data: {
      modelNumber: 'LED-40W-BATTEN',
      productName: '40W Linear Batten Tube Light (4ft)',
      wattage: 40,
      description: 'Commercial office batten luminaire, flicker-free driver, extruded aluminum channel, 4000 lumens.',
      status: ProductStatus.ACTIVE,
    },
  });

  console.log('✅ Products seeded successfully.');

  // 3. Seed Raw Materials
  const matChip2835 = await prisma.material.create({
    data: {
      materialCode: 'RM-CHIP-2835',
      materialName: 'SMD 2835 LED Chip (6500K, 0.2W)',
      category: 'Chips',
      currentStock: 45000,
      reservedStock: 3600, // reserved for orders
      unit: 'PCS',
      unitCost: 0.045,
      reorderLevel: 5000,
      supplier: 'Lumileds Semiconductor Corp',
    },
  });

  const matChip3030 = await prisma.material.create({
    data: {
      materialCode: 'RM-CHIP-3030',
      materialName: 'High Power SMD 3030 LED (1W 130lm)',
      category: 'Chips',
      currentStock: 18000,
      reservedStock: 0,
      unit: 'PCS',
      unitCost: 0.12,
      reorderLevel: 3000,
      supplier: 'Osram Opto Semiconductors',
    },
  });

  const matDriver12 = await prisma.material.create({
    data: {
      materialCode: 'RM-DRV-12W',
      materialName: 'Constant Current Isolated Driver 12W (300mA)',
      category: 'Drivers',
      currentStock: 3500,
      reservedStock: 300,
      unit: 'PCS',
      unitCost: 1.35,
      reorderLevel: 500,
      supplier: 'MeanWell Power Tech',
    },
  });

  const matDriver9 = await prisma.material.create({
    data: {
      materialCode: 'RM-DRV-9W',
      materialName: 'Constant Current Driver 9W (240mA)',
      category: 'Drivers',
      currentStock: 2800,
      reservedStock: 300,
      unit: 'PCS',
      unitCost: 1.10,
      reorderLevel: 400,
      supplier: 'MeanWell Power Tech',
    },
  });

  const matDriver18 = await prisma.material.create({
    data: {
      materialCode: 'RM-DRV-18W',
      materialName: 'Slim Constant Current Driver 18W',
      category: 'Drivers',
      currentStock: 1200,
      reservedStock: 0,
      unit: 'PCS',
      unitCost: 2.15,
      reorderLevel: 250,
      supplier: 'Philips Lighting OEM',
    },
  });

  const matDriver50 = await prisma.material.create({
    data: {
      materialCode: 'RM-DRV-50W',
      materialName: 'High Surge Waterproof Driver 50W (IP67)',
      category: 'Drivers',
      currentStock: 450,
      reservedStock: 0,
      unit: 'PCS',
      unitCost: 5.80,
      reorderLevel: 100,
      supplier: 'Inventronics Corp',
    },
  });

  const matPcb12 = await prisma.material.create({
    data: {
      materialCode: 'RM-PCB-12W',
      materialName: 'Circular Aluminum MCPCB 12W (12-LED array)',
      category: 'Electronics',
      currentStock: 3200,
      reservedStock: 300,
      unit: 'PCS',
      unitCost: 0.58,
      reorderLevel: 500,
      supplier: 'Kingboard Laminates Ltd',
    },
  });

  const matPcb9 = await prisma.material.create({
    data: {
      materialCode: 'RM-PCB-9W',
      materialName: 'Circular Aluminum MCPCB 9W (9-LED array)',
      category: 'Electronics',
      currentStock: 2900,
      reservedStock: 300,
      unit: 'PCS',
      unitCost: 0.48,
      reorderLevel: 450,
      supplier: 'Kingboard Laminates Ltd',
    },
  });

  const matHs12 = await prisma.material.create({
    data: {
      materialCode: 'RM-HS-12W',
      materialName: 'Die-cast Aluminum Heat Sink Core 12W',
      category: 'Mechanics',
      currentStock: 4100,
      reservedStock: 300,
      unit: 'PCS',
      unitCost: 0.72,
      reorderLevel: 600,
      supplier: 'Sunon Thermal Dynamics',
    },
  });

  const matHousingB22 = await prisma.material.create({
    data: {
      materialCode: 'RM-HSG-B22',
      materialName: 'Polycarbonate Bulb Housing Shell with B22 Cap',
      category: 'Mechanics',
      currentStock: 4300,
      reservedStock: 300,
      unit: 'PCS',
      unitCost: 0.42,
      reorderLevel: 600,
      supplier: 'Sabic Polymer Global',
    },
  });

  const matScrewM3 = await prisma.material.create({
    data: {
      materialCode: 'RM-SCRW-M3',
      materialName: 'Stainless Steel M3x6mm Fastener Screws',
      category: 'Hardware',
      currentStock: 32000,
      reservedStock: 600,
      unit: 'PCS',
      unitCost: 0.018,
      reorderLevel: 2500,
      supplier: 'FastenTech Precision',
    },
  });

  const matWire24 = await prisma.material.create({
    data: {
      materialCode: 'RM-WIRE-24',
      materialName: 'Heat Resistant Silicone Wire 24 AWG (Red/Black)',
      category: 'Electrical',
      currentStock: 1500,
      reservedStock: 60,
      unit: 'METERS',
      unitCost: 0.14,
      reorderLevel: 200,
      supplier: 'AlphaWire Industrial',
    },
  });

  // Low stock item to trigger alert!
  const matCap400 = await prisma.material.create({
    data: {
      materialCode: 'RM-CAP-400V',
      materialName: 'Low ESR Electrolytic Capacitor 400V 10uF (105°C)',
      category: 'Electronics',
      currentStock: 340, // Below 800 reorder level!
      reservedStock: 120,
      unit: 'PCS',
      unitCost: 0.32,
      reorderLevel: 800,
      supplier: 'Nichicon Electronics',
    },
  });

  const matPaste = await prisma.material.create({
    data: {
      materialCode: 'RM-THRM-PST',
      materialName: 'Thermally Conductive Silicone Grease 30g Tube',
      category: 'Chemicals',
      currentStock: 140,
      reservedStock: 15,
      unit: 'TUBES',
      unitCost: 2.45,
      reorderLevel: 40,
      supplier: 'Arctic Thermal Solutions',
    },
  });

  const matBox12 = await prisma.material.create({
    data: {
      materialCode: 'RM-PKG-BOX12',
      materialName: 'Color Retail Packaging Box for 12W Bulb',
      category: 'Packaging',
      currentStock: 5200,
      reservedStock: 300,
      unit: 'PCS',
      unitCost: 0.16,
      reorderLevel: 800,
      supplier: 'PackWell Printing Corp',
    },
  });

  console.log('✅ Materials seeded successfully.');

  // 4. Seed BOMs
  // BOM for LED-12W-WHITE
  const bom12w = await prisma.bOM.create({
    data: {
      productId: prod12w.id,
      version: '1.0',
      status: 'ACTIVE',
      notes: 'Standard production BOM for 12W Cool White LED Bulb with B22 Base',
      items: {
        create: [
          { materialId: matChip2835.id, quantityRequired: 12 },
          { materialId: matDriver12.id, quantityRequired: 1 },
          { materialId: matPcb12.id, quantityRequired: 1 },
          { materialId: matHs12.id, quantityRequired: 1 },
          { materialId: matHousingB22.id, quantityRequired: 1 },
          { materialId: matScrewM3.id, quantityRequired: 2 },
          { materialId: matWire24.id, quantityRequired: 0.2 },
          { materialId: matBox12.id, quantityRequired: 1 },
        ],
      },
    },
  });

  // BOM for LED-9W-WARM
  const bom9w = await prisma.bOM.create({
    data: {
      productId: prod9w.id,
      version: '1.0',
      status: 'ACTIVE',
      notes: 'Standard production BOM for 9W Warm White LED Bulb',
      items: {
        create: [
          { materialId: matChip2835.id, quantityRequired: 9 },
          { materialId: matDriver9.id, quantityRequired: 1 },
          { materialId: matPcb9.id, quantityRequired: 1 },
          { materialId: matHousingB22.id, quantityRequired: 1 },
          { materialId: matScrewM3.id, quantityRequired: 2 },
          { materialId: matWire24.id, quantityRequired: 0.2 },
        ],
      },
    },
  });

  console.log('✅ BOMs seeded successfully.');

  // 5. Seed Production Orders
  // Order 1: Completed order
  const order1 = await prisma.productionOrder.create({
    data: {
      orderNumber: 'PO-2026-0001',
      productId: prod12w.id,
      quantity: 200,
      productionDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      status: OrderStatus.COMPLETED,
      stage: AssemblyStage.FINISHED,
      stageNotes: 'All 200 units assembled, 100% burned in 4 hrs, QC passed with zero defects.',
      createdById: supervisor.id,
      requiredMaterials: {
        create: [
          { materialId: matChip2835.id, requiredQuantity: 2400, reservedQuantity: 0, issuedQuantity: 2400 },
          { materialId: matDriver12.id, requiredQuantity: 200, reservedQuantity: 0, issuedQuantity: 200 },
          { materialId: matPcb12.id, requiredQuantity: 200, reservedQuantity: 0, issuedQuantity: 200 },
          { materialId: matHs12.id, requiredQuantity: 200, reservedQuantity: 0, issuedQuantity: 200 },
          { materialId: matHousingB22.id, requiredQuantity: 200, reservedQuantity: 0, issuedQuantity: 200 },
          { materialId: matScrewM3.id, requiredQuantity: 400, reservedQuantity: 0, issuedQuantity: 400 },
        ],
      },
    },
  });

  // Order 2: In-Progress order (Testing stage)
  const order2 = await prisma.productionOrder.create({
    data: {
      orderNumber: 'PO-2026-0002',
      productId: prod12w.id,
      quantity: 100,
      productionDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      status: OrderStatus.IN_PROGRESS,
      stage: AssemblyStage.TESTING,
      stageNotes: 'Batch on aging rack 3 for 4-hour burn in test and electrical parameters.',
      createdById: supervisor.id,
      requiredMaterials: {
        create: [
          { materialId: matChip2835.id, requiredQuantity: 1200, reservedQuantity: 0, issuedQuantity: 1200 },
          { materialId: matDriver12.id, requiredQuantity: 100, reservedQuantity: 0, issuedQuantity: 100 },
          { materialId: matPcb12.id, requiredQuantity: 100, reservedQuantity: 0, issuedQuantity: 100 },
          { materialId: matHs12.id, requiredQuantity: 100, reservedQuantity: 0, issuedQuantity: 100 },
          { materialId: matHousingB22.id, requiredQuantity: 100, reservedQuantity: 0, issuedQuantity: 100 },
        ],
      },
    },
  });

  // Order 3: Locked order (Material Reserved)
  const order3 = await prisma.productionOrder.create({
    data: {
      orderNumber: 'PO-2026-0003',
      productId: prod9w.id,
      quantity: 300,
      productionDate: new Date(),
      status: OrderStatus.LOCKED,
      stage: AssemblyStage.MATERIAL_ISSUED,
      stageNotes: 'Production order locked by supervisor. Materials strictly reserved in store.',
      createdById: supervisor.id,
      requiredMaterials: {
        create: [
          { materialId: matChip2835.id, requiredQuantity: 2700, reservedQuantity: 2700, issuedQuantity: 0 },
          { materialId: matDriver9.id, requiredQuantity: 300, reservedQuantity: 300, issuedQuantity: 0 },
          { materialId: matPcb9.id, requiredQuantity: 300, reservedQuantity: 300, issuedQuantity: 0 },
        ],
      },
    },
  });

  // Order 4: Draft order
  const order4 = await prisma.productionOrder.create({
    data: {
      orderNumber: 'PO-2026-0004',
      productId: prod18w.id,
      quantity: 150,
      productionDate: new Date(),
      status: OrderStatus.DRAFT,
      stage: AssemblyStage.MATERIAL_ISSUED,
      stageNotes: 'Draft order created awaiting store keeper review.',
      createdById: supervisor.id,
      requiredMaterials: {
        create: [
          { materialId: matDriver18.id, requiredQuantity: 150, reservedQuantity: 0, issuedQuantity: 0 },
        ],
      },
    },
  });

  console.log('✅ Production orders seeded successfully.');

  // 6. Seed QC Reports & Certificates
  const qcReportPass = await prisma.qCReport.create({
    data: {
      reportNumber: 'QCR-2026-0001',
      productionOrderId: order1.id,
      batchNumber: 'BATCH-2026-101',
      voltage: 230.4,
      current: 0.052,
      power: 12.0,
      temperature: 46.8,
      burnInTestDuration: '4 Hours Continuous Load @ 45°C ambient',
      remarks: 'Exemplary lumen efficiency (102 lm/W). Power factor 0.96. Zero thermal runaways.',
      result: QCResult.PASS,
      failureReason: FailureReason.NONE,
      inspectedById: qcEngineer.id,
      inspectorName: qcEngineer.name,
    },
  });

  await prisma.qCCertificate.create({
    data: {
      certificateNumber: 'QCC-2026-001',
      qcReportId: qcReportPass.id,
      batchNumber: 'BATCH-2026-101',
      productId: prod12w.id,
      inspectionDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      inspectorName: qcEngineer.name,
      result: QCResult.PASS,
    },
  });

  // A failed QC report sample for analytics and alerts
  await prisma.qCReport.create({
    data: {
      reportNumber: 'QCR-2026-0002',
      productionOrderId: order2.id,
      batchNumber: 'BATCH-2026-098-REJECT',
      voltage: 248.0,
      current: 0.082,
      power: 19.8,
      temperature: 78.4,
      burnInTestDuration: '1.5 Hours (Aborted)',
      remarks: 'High current surge during thermal stress. Driver electrolytic capacitor overheating.',
      result: QCResult.FAIL,
      failureReason: FailureReason.DRIVER_FAILURE,
      inspectedById: qcEngineer.id,
      inspectorName: qcEngineer.name,
    },
  });

  console.log('✅ QC Reports & Certificates seeded.');

  // 7. Seed Finished Goods
  await prisma.finishedGoods.create({
    data: {
      batchNumber: 'BATCH-2026-101',
      productId: prod12w.id,
      quantity: 200,
      reservedQuantity: 50, // 50 reserved for dispatch order DSP-2026-0001
      manufacturingDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      qcStatus: QCResult.PASS,
      notes: 'Freshly packaged 12W LED Bulbs in warehouse bay B-04.',
    },
  });

  await prisma.finishedGoods.create({
    data: {
      batchNumber: 'BATCH-2026-095',
      productId: prod9w.id,
      quantity: 420,
      reservedQuantity: 80,
      manufacturingDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      qcStatus: QCResult.PASS,
      notes: '9W Warm White Bulbs ready in warehouse bay A-12.',
    },
  });

  await prisma.finishedGoods.create({
    data: {
      batchNumber: 'BATCH-2026-088',
      productId: prod18w.id,
      quantity: 160,
      reservedQuantity: 0,
      manufacturingDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      qcStatus: QCResult.PASS,
      notes: '18W Panel downlights in bay C-01.',
    },
  });

  console.log('✅ Finished goods inventory seeded.');

  // 8. Seed Dispatch Orders
  await prisma.dispatchOrder.create({
    data: {
      dispatchOrderNumber: 'DSP-2026-0001',
      customerName: 'Metro Mega Retailers Ltd',
      invoiceNumber: 'INV-2026-8801',
      productId: prod12w.id,
      quantity: 50,
      dispatchDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      status: DispatchStatus.DISPATCHED,
      createdById: dispatchTeam.id,
    },
  });

  await prisma.dispatchOrder.create({
    data: {
      dispatchOrderNumber: 'DSP-2026-0002',
      customerName: 'Apex Commercial Electricals',
      invoiceNumber: 'INV-2026-8802',
      productId: prod9w.id,
      quantity: 80,
      dispatchDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      status: DispatchStatus.PENDING,
      createdById: dispatchTeam.id,
    },
  });

  console.log('✅ Dispatch orders seeded.');

  // 9. Seed Inventory Transactions
  await prisma.inventoryTransaction.createMany({
    data: [
      {
        materialId: matChip2835.id,
        transactionType: TransactionType.INWARD,
        quantity: 50000,
        previousStock: 0,
        newStock: 50000,
        referenceType: 'PO_INWARD',
        referenceId: 'PO-REC-2026-01',
        notes: 'Initial inward from Lumileds Semiconductor',
        createdById: storeKeeper.id,
      },
      {
        materialId: matDriver12.id,
        transactionType: TransactionType.INWARD,
        quantity: 4000,
        previousStock: 0,
        newStock: 4000,
        referenceType: 'PO_INWARD',
        referenceId: 'PO-REC-2026-02',
        notes: 'Driver batch received and verified',
        createdById: storeKeeper.id,
      },
      {
        materialId: matChip2835.id,
        transactionType: TransactionType.RESERVED,
        quantity: 2700,
        previousStock: 47700,
        newStock: 45000,
        referenceType: 'PRODUCTION_ORDER',
        referenceId: order3.orderNumber,
        notes: `Reserved 2700 chips for locked order ${order3.orderNumber}`,
        createdById: supervisor.id,
      },
      {
        materialId: matDriver12.id,
        transactionType: TransactionType.ISSUED,
        quantity: 200,
        previousStock: 3700,
        newStock: 3500,
        referenceType: 'PRODUCTION_ORDER',
        referenceId: order1.orderNumber,
        notes: `Issued 200 drivers to assembly line for ${order1.orderNumber}`,
        createdById: storeKeeper.id,
      },
    ],
  });

  console.log('✅ Inventory transactions seeded.');

  // 10. Seed Notifications
  await prisma.notification.createMany({
    data: [
      {
        title: 'Low Stock Alert',
        message: 'RM-CAP-400V (Low ESR Capacitor 400V) has dropped to 340 PCS (Reorder level: 800 PCS).',
        type: NotificationType.LOW_STOCK,
        targetRole: Role.STORE_KEEPER,
        link: '/materials',
      },
      {
        title: 'QC Failure Detected',
        message: 'Batch BATCH-2026-098-REJECT failed burn-in testing due to DRIVER_FAILURE. Action required.',
        type: NotificationType.QC_FAILURE,
        targetRole: Role.QC_ENGINEER,
        link: '/qc-testing',
      },
      {
        title: 'Production Order Locked',
        message: 'PO-2026-0003 for 300 units of 9W Warm White has been locked. 2,700 chips and 300 drivers reserved.',
        type: NotificationType.INFO,
        targetRole: Role.PRODUCTION_SUPERVISOR,
        link: '/production-orders',
      },
      {
        title: 'Pending Dispatch Order',
        message: 'Customer Apex Commercial Electricals has 80 units scheduled for dispatch tomorrow.',
        type: NotificationType.PENDING_DISPATCH,
        targetRole: Role.DISPATCH_TEAM,
        link: '/dispatch',
      },
    ],
  });

  console.log('✅ Notifications seeded.');

  // 11. Seed Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        userId: admin.id,
        userName: admin.name,
        action: 'SYSTEM_INITIALIZED',
        module: 'System',
        details: 'Initial database configuration and seed execution completed.',
      },
      {
        userId: storeKeeper.id,
        userName: storeKeeper.name,
        action: 'MATERIAL_ADDED',
        module: 'Inventory',
        details: 'Inward receipt recorded for 50,000 units of RM-CHIP-2835.',
      },
      {
        userId: supervisor.id,
        userName: supervisor.name,
        action: 'PRODUCTION_ORDER_LOCKED',
        module: 'Production',
        details: 'Order PO-2026-0003 locked. Materials moved from Available to Reserved stock.',
      },
      {
        userId: qcEngineer.id,
        userName: qcEngineer.name,
        action: 'QC_APPROVED',
        module: 'Quality Control',
        details: 'Batch BATCH-2026-101 passed electrical & thermal test. Certificate QCC-2026-001 issued.',
      },
      {
        userId: dispatchTeam.id,
        userName: dispatchTeam.name,
        action: 'DISPATCH_COMPLETED',
        module: 'Dispatch',
        details: 'Order DSP-2026-0001 dispatched 50 units to Metro Mega Retailers Ltd.',
      },
    ],
  });

  console.log('✅ Audit logs seeded.');
  console.log('🎉 Database seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
