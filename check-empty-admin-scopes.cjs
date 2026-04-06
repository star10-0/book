const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

(async () => {
  const rows = await prisma.user.findMany({
    where: {
      role: "ADMIN",
      adminScopes: { isEmpty: true },
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      adminScopes: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  console.table(
    rows.map((r) => ({
      id: r.id,
      email: r.email,
      fullName: r.fullName,
      adminScopes: r.adminScopes.length ? r.adminScopes.join(", ") : "(empty)",
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }))
  );

  console.log("EMPTY_ADMIN_SCOPE_COUNT =", rows.length);
})()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
