-- Seed default category tree (idempotent). Matches packages/db/prisma/seed.ts CATEGORY_TREE.
INSERT INTO "Category" ("id", "name", "parentId", "sort", "icon") VALUES
  ('cat-book', '教材书籍', NULL, 1, NULL),
  ('cat-digital', '电子数码', NULL, 2, NULL),
  ('cat-life', '生活用品', NULL, 3, NULL),
  ('cat-cloth', '服饰鞋包', NULL, 4, NULL),
  ('cat-sport', '运动户外', NULL, 5, NULL)
ON CONFLICT("id") DO UPDATE SET
  "name" = excluded."name",
  "parentId" = excluded."parentId",
  "sort" = excluded."sort";

INSERT INTO "Category" ("id", "name", "parentId", "sort", "icon") VALUES
  ('cat-book-textbook', '专业教材', 'cat-book', 1, NULL),
  ('cat-book-exam', '考研考证', 'cat-book', 2, NULL),
  ('cat-book-novel', '文学小说', 'cat-book', 3, NULL),
  ('cat-digital-phone', '手机平板', 'cat-digital', 1, NULL),
  ('cat-digital-computer', '电脑配件', 'cat-digital', 2, NULL),
  ('cat-digital-accessory', '数码配件', 'cat-digital', 3, NULL),
  ('cat-life-daily', '日用百货', 'cat-life', 1, NULL),
  ('cat-life-furniture', '宿舍家居', 'cat-life', 2, NULL),
  ('cat-cloth-clothes', '服装', 'cat-cloth', 1, NULL),
  ('cat-cloth-shoes', '鞋靴', 'cat-cloth', 2, NULL),
  ('cat-sport-fitness', '健身器材', 'cat-sport', 1, NULL),
  ('cat-sport-bike', '自行车', 'cat-sport', 2, NULL)
ON CONFLICT("id") DO UPDATE SET
  "name" = excluded."name",
  "parentId" = excluded."parentId",
  "sort" = excluded."sort";
