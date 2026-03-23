import { PrismaClient, BookFormat, BookStatus, CurrencyCode, OfferType, UserRole } from '@prisma/client';
import { hashPassword } from '../src/lib/auth-password';

const prisma = new PrismaClient();

type SeedBook = {
  slug: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  coverImageUrl: string;
  publicationDate: Date;
  authorSlug: string;
  categorySlug: string;
  offers: Array<{
    type: OfferType;
    priceCents: number;
    currency: CurrencyCode;
    rentalDays?: number;
  }>;
};

const seed = async () => {
  const adminPasswordHash = await hashPassword('AdminPass123!');

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@book.local' },
    update: {
      fullName: 'مدير المنصة',
      role: UserRole.ADMIN,
      isActive: true,
      passwordHash: adminPasswordHash,
    },
    create: {
      email: 'admin@book.local',
      fullName: 'مدير المنصة',
      role: UserRole.ADMIN,
      isActive: true,
      passwordHash: adminPasswordHash,
    },
  });

  const authors = [
    {
      slug: 'layth-haddad',
      nameAr: 'ليث حداد',
      nameEn: 'Layth Haddad',
      bioAr:
        'كاتب سوري معاصر يركز في أعماله على التحولات الاجتماعية والهوية الفردية في المدن الكبيرة.',
      bioEn:
        'A contemporary Syrian author focusing on social transformation and personal identity in large cities.',
    },
    {
      slug: 'rana-masri',
      nameAr: 'رنا المصري',
      nameEn: 'Rana Al Masri',
      bioAr:
        'روائية تهتم بأدب العلاقات الإنسانية وتكتب بلغة شاعرية قريبة من القارئ العربي الشاب.',
      bioEn:
        'A novelist interested in human relationships, writing in a lyrical style for young Arabic readers.',
    },
    {
      slug: 'omar-khayyat',
      nameAr: 'عمر الخياط',
      nameEn: 'Omar Khayyat',
      bioAr:
        'باحث وكاتب في تاريخ المدن العربية، يمزج بين السرد الوثائقي والحكاية الأدبية.',
      bioEn:
        'A researcher and writer on Arab urban history, blending documentary narrative with literary storytelling.',
    },
  ];

  const authorMap = new Map<string, string>();

  for (const author of authors) {
    const upsertedAuthor = await prisma.author.upsert({
      where: { slug: author.slug },
      update: {
        nameAr: author.nameAr,
        nameEn: author.nameEn,
        bioAr: author.bioAr,
        bioEn: author.bioEn,
      },
      create: author,
    });

    authorMap.set(author.slug, upsertedAuthor.id);
  }

  const categories = [
    {
      slug: 'riwayat',
      nameAr: 'روايات',
      nameEn: 'Novels',
      description: 'روايات عربية معاصرة كلاسيكية وحديثة.',
    },
    {
      slug: 'tarikh',
      nameAr: 'تاريخ',
      nameEn: 'History',
      description: 'كتب تاريخية موثوقة حول المدن والثقافة العربية.',
    },
    {
      slug: 'tatwir-dhat',
      nameAr: 'تطوير ذات',
      nameEn: 'Self Development',
      description: 'عناوين عملية لتحسين العادات والإنتاجية ونمط الحياة.',
    },
    {
      slug: 'adab',
      nameAr: 'أدب',
      nameEn: 'Literature',
      description: 'نصوص أدبية وقصص قصيرة وسير سردية.',
    },
    {
      slug: 'fikr',
      nameAr: 'فكر وثقافة',
      nameEn: 'Thought & Culture',
      description: 'كتب فكرية تناقش المجتمع والثقافة واللغة.',
    },
  ];

  const categoryMap = new Map<string, string>();

  for (const category of categories) {
    const upsertedCategory = await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        nameAr: category.nameAr,
        nameEn: category.nameEn,
        description: category.description,
      },
      create: category,
    });

    categoryMap.set(category.slug, upsertedCategory.id);
  }

  const books: SeedBook[] = [
    {
      slug: 'madinat-al-zilal',
      titleAr: 'مدينة الظلال',
      titleEn: 'City of Shadows',
      descriptionAr:
        'رواية تدور في دمشق الحديثة، حيث يحاول صحفي شاب كشف شبكة مصالح تخفي أسراراً قديمة تربط الماضي بالحاضر.',
      coverImageUrl: 'https://placehold.co/600x900?text=Book+Cover+01',
      publicationDate: new Date('2023-03-18'),
      authorSlug: 'layth-haddad',
      categorySlug: 'riwayat',
      offers: [
        { type: OfferType.PURCHASE, priceCents: 5500, currency: CurrencyCode.SYP },
        { type: OfferType.RENTAL, priceCents: 1800, currency: CurrencyCode.SYP, rentalDays: 14 },
      ],
    },
    {
      slug: 'khuyut-al-nahr',
      titleAr: 'خيوط النهر',
      titleEn: 'Threads of the River',
      descriptionAr:
        'مجموعة قصصية تتتبع حكايات عائلات تعيش قرب النهر، وتكشف كيف يمكن لتفاصيل يومية بسيطة أن تغيّر مصير الإنسان.',
      coverImageUrl: 'https://placehold.co/600x900?text=Book+Cover+02',
      publicationDate: new Date('2022-11-04'),
      authorSlug: 'rana-masri',
      categorySlug: 'adab',
      offers: [{ type: OfferType.PURCHASE, priceCents: 4300, currency: CurrencyCode.SYP }],
    },
    {
      slug: 'safar-fi-dhakirat-halab',
      titleAr: 'سفر في ذاكرة حلب',
      titleEn: 'Journey Through Aleppo Memory',
      descriptionAr:
        'كتاب تاريخي يوثق التحولات العمرانية والثقافية في مدينة حلب عبر شهادات وصور ونصوص أرشيفية.',
      coverImageUrl: 'https://placehold.co/600x900?text=Book+Cover+03',
      publicationDate: new Date('2021-06-12'),
      authorSlug: 'omar-khayyat',
      categorySlug: 'tarikh',
      offers: [
        { type: OfferType.PURCHASE, priceCents: 6200, currency: CurrencyCode.SYP },
        { type: OfferType.RENTAL, priceCents: 2200, currency: CurrencyCode.SYP, rentalDays: 21 },
      ],
    },
    {
      slug: 'alat-tarkiz-al-yawmi',
      titleAr: 'آلة التركيز اليومي',
      titleEn: 'Daily Focus Machine',
      descriptionAr:
        'دليل عملي باللغة العربية لبناء روتين يومي متوازن يساعد على زيادة التركيز وتقليل التشتيت في بيئة العمل.',
      coverImageUrl: 'https://placehold.co/600x900?text=Book+Cover+04',
      publicationDate: new Date('2024-01-09'),
      authorSlug: 'rana-masri',
      categorySlug: 'tatwir-dhat',
      offers: [{ type: OfferType.RENTAL, priceCents: 1500, currency: CurrencyCode.SYP, rentalDays: 7 }],
    },
    {
      slug: 'asila-al-hawia',
      titleAr: 'أسئلة الهوية',
      titleEn: 'Questions of Identity',
      descriptionAr:
        'نص فكري يناقش معنى الهوية العربية في العصر الرقمي من خلال أمثلة ثقافية واجتماعية قريبة من الواقع.',
      coverImageUrl: 'https://placehold.co/600x900?text=Book+Cover+05',
      publicationDate: new Date('2020-09-22'),
      authorSlug: 'layth-haddad',
      categorySlug: 'fikr',
      offers: [{ type: OfferType.PURCHASE, priceCents: 4800, currency: CurrencyCode.SYP }],
    },
    {
      slug: 'qahwat-al-subh',
      titleAr: 'قهوة الصبح',
      titleEn: 'Morning Coffee',
      descriptionAr:
        'رواية اجتماعية دافئة ترصد حياة أربعة أصدقاء يجتمعون كل صباح في مقهى قديم ويتبادلون أحلامهم ومخاوفهم.',
      coverImageUrl: 'https://placehold.co/600x900?text=Book+Cover+06',
      publicationDate: new Date('2023-08-01'),
      authorSlug: 'rana-masri',
      categorySlug: 'riwayat',
      offers: [
        { type: OfferType.PURCHASE, priceCents: 5100, currency: CurrencyCode.SYP },
        { type: OfferType.RENTAL, priceCents: 1700, currency: CurrencyCode.SYP, rentalDays: 10 },
      ],
    },
    {
      slug: 'hikayat-suoq-al-hamidiya',
      titleAr: 'حكايات سوق الحميدية',
      titleEn: 'Stories of Al-Hamidiya Souq',
      descriptionAr:
        'سرد أدبي يستعيد ذاكرة السوق الدمشقي الأشهر من خلال حكايات التجار والزوّار في فصول قصيرة ممتعة.',
      coverImageUrl: 'https://placehold.co/600x900?text=Book+Cover+07',
      publicationDate: new Date('2019-12-15'),
      authorSlug: 'omar-khayyat',
      categorySlug: 'adab',
      offers: [{ type: OfferType.RENTAL, priceCents: 1400, currency: CurrencyCode.SYP, rentalDays: 14 }],
    },
    {
      slug: 'mustaqbal-al-qiraa',
      titleAr: 'مستقبل القراءة',
      titleEn: 'The Future of Reading',
      descriptionAr:
        'كتاب ثقافي يستعرض كيف غيّرت التقنيات الحديثة طريقة القراءة والتعلّم، وما الفرص المتاحة للقارئ العربي.',
      coverImageUrl: 'https://placehold.co/600x900?text=Book+Cover+08',
      publicationDate: new Date('2024-05-19'),
      authorSlug: 'layth-haddad',
      categorySlug: 'fikr',
      offers: [
        { type: OfferType.PURCHASE, priceCents: 5900, currency: CurrencyCode.SYP },
        { type: OfferType.RENTAL, priceCents: 2100, currency: CurrencyCode.SYP, rentalDays: 30 },
      ],
    },
  ];

  for (const book of books) {
    const authorId = authorMap.get(book.authorSlug);
    const categoryId = categoryMap.get(book.categorySlug);

    if (!authorId || !categoryId) {
      throw new Error(`Missing relation for book: ${book.slug}`);
    }

    const upsertedBook = await prisma.book.upsert({
      where: { slug: book.slug },
      update: {
        titleAr: book.titleAr,
        titleEn: book.titleEn,
        descriptionAr: book.descriptionAr,
        coverImageUrl: book.coverImageUrl,
        status: BookStatus.PUBLISHED,
        format: BookFormat.DIGITAL,
        publicationDate: book.publicationDate,
        authorId,
        categoryId,
      },
      create: {
        slug: book.slug,
        titleAr: book.titleAr,
        titleEn: book.titleEn,
        descriptionAr: book.descriptionAr,
        coverImageUrl: book.coverImageUrl,
        status: BookStatus.PUBLISHED,
        format: BookFormat.DIGITAL,
        publicationDate: book.publicationDate,
        authorId,
        categoryId,
      },
    });

    await prisma.bookOffer.deleteMany({ where: { bookId: upsertedBook.id } });

    await prisma.bookOffer.createMany({
      data: book.offers.map((offer) => ({
        bookId: upsertedBook.id,
        type: offer.type,
        priceCents: offer.priceCents,
        currency: offer.currency,
        rentalDays: offer.rentalDays ?? null,
        isActive: true,
      })),
    });
  }

  console.log(`Seed complete: users(1), authors(${authors.length}), categories(${categories.length}), books(${books.length}).`);
  console.log(`Admin user: ${adminUser.email}`);
};

seed()
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
