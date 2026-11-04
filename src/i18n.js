// UI strings. HR and Tendering texts are used word for word (handoff pp. 26–27).
const LANGS = ['en', 'ar'];
const DIR = { en: 'ltr', ar: 'rtl' };
const LANG_NAMES = { en: 'EN', ar: 'عربي' };

const en = {
  site_name: 'ENMAA',
  nav_home: 'Home', nav_developments: 'Our Developments', nav_careers: 'Careers', nav_vendors: 'Vendors', nav_investors: 'Investors',
  menu: 'Menu', close: 'Close', pause_slideshow: 'Pause slideshow', play_slideshow: 'Play slideshow', skip: 'Skip to content', language: 'Language',

  footer_company: 'Company', footer_about: 'About', footer_news: 'News', footer_contact: 'Contact',
  footer_explore: 'Explore', footer_work: 'Work With Us', footer_vendor_reg: 'Vendor registration',
  privacy: 'Privacy', terms: 'Terms', accessibility: 'Accessibility', rights: 'All rights reserved.',

  hero_eyebrow: 'A Master Developer · Libya',
  hero_title: 'Shaping Libya',
  hero_text: 'Global thinking applied to local potential: districts, destinations and developments built for progress.',
  hero_cta: 'Explore Our Developments', hero_explore: 'Explore', hero_story: 'Our story', scroll: 'Scroll', prev_slide: 'Previous slide', next_slide: 'Next slide',
  type_1: 'Masterplanned Communities', type_2: 'Commercial Districts', type_3: 'Waterfronts', type_4: 'Mixed-Use',
  type_1_text: 'Neighbourhoods planned around people, parks and daily life.',
  type_2_text: 'Business districts designed to attract enterprise and investment.',
  type_3_text: 'Coastal destinations that connect cities to the sea.',
  type_4_text: 'Places where living, working and leisure come together.',

  label_we_are: 'We are ENMAA',
  we_are_title: 'A master developer shaping Libya’s future, one district, destination and development at a time.',
  we_are_text: 'With every district, destination and development, we apply global thinking to local potential, one that reflects the richness of its land and the ambition of what lies ahead. We exist to deliver progress at scale, and to showcase Libya to the world through the quality of what we create.',
  about_more: 'About ENMAA',

  label_developments: 'Our Developments', all_developments: 'All Developments', view_project: 'View Development',
  label_what_we_do: 'What we do', what_we_do_title: 'Places built for progress',
  label_values: 'What guides us', values_title: 'Our values',
  value_1: 'Vision with Purpose', value_1_text: 'We don’t just build, we envision. Every destination begins with a long-term view rooted in real human needs and national potential.',
  value_2: 'Collective Impact', value_2_text: 'We believe in the power of collaboration, between people, businesses and cities, to create a greater shared future.',
  value_3: 'People First', value_3_text: 'Every decision begins with people in mind, how they move, connect, feel and thrive in the places we create.',
  value_4: 'Forward Thinking', value_4_text: 'We think long-term. We act with purpose. Our developments are designed to spark growth, unlock opportunity and shape new standards for urban life.',
  value_5: 'Excellence as a Standard', value_5_text: 'Our benchmark is global. We deliver with precision, design with ambition and execute with discipline, ensuring world-class quality across all touchpoints.',
  label_news: 'News & updates', news_title: 'Latest stories', all_news: 'All News', read_more: 'Read more', back_to_news: 'Back to news',
  no_news: 'News will be published here soon.', news_prev: 'Previous story', news_next: 'Next story', news_drag: 'Drag or use the arrows to explore', open_full_story: 'Open full page', copy_link: 'Copy link', link_copied: 'Link copied',
  label_partners: 'Working with', label_find_way: 'Work with ENMAA', find_way_title: 'Find your way in',
  path_invest: 'Invest', path_invest_eyebrow: 'For investors', path_invest_text: 'Explore opportunities across Libya and register your interest.', path_invest_cta: 'Investor relations',
  path_vendors: 'Vendors', path_vendors_eyebrow: 'For firms', path_vendors_text: 'Register your consultancy, contracting or supply company with ENMAA.', path_vendors_cta: 'Register your company',
  path_careers: 'Careers', path_careers_eyebrow: 'For people', path_careers_text: 'Build a career shaping the places Libya will live in.', path_careers_cta: 'Open roles',

  kw_label: 'Explore', kw_title: 'Find your place', kw_intro: 'Choose what matters to you. The model builds itself as you choose, and the developments that have everything you picked appear on it.',
  kw_start: 'Choose one or more keywords to begin.', kw_matches: '{n} developments have everything you chose', kw_matches_one: 'One development has everything you chose', kw_matches_two: '{n} developments have everything you chose', kw_matches_few: '{n} developments have everything you chose', kw_none: 'No development has all of these yet. Try removing one.',
  kw_clear: 'Clear', kw_open: 'See what it contains', kw_full: 'Open full page', kw_hint: 'Drag to turn the model',
  filter_all: 'All', filter_city: 'City', filter_explore_label: 'Explore by', filter_explore_title: 'What are you looking for?', filter_show_all: 'Show all developments',
  dev_no_results: 'No developments match these filters.',
  dev_hero_title: 'Our Developments', dev_hero_text: 'Explore the places shaping Libya’s next chapter.',
  developments_count: '{n} developments', developments_count_one: '1 development', developments_count_two: '{n} developments', developments_count_few: '{n} developments',
  fact_location: 'Location', fact_type: 'Type', fact_area: 'Site area', fact_masterplanner: 'Masterplanner',
  download_brochure: 'Download Brochure', register_interest: 'Register Interest',
  tab_overview: 'Overview', tab_story: 'Experience', tab_gallery: 'Gallery', tab_enquire: 'Enquire',
  gallery: 'Gallery', label_render: 'Render', label_lifestyle: 'Lifestyle', label_photo: 'Photo',
  project_enquiry_title: 'Enquire about this development', project_enquiry_text: 'Leave your details and our team will be in touch.',
  other_developments: 'More developments', all_developments_link: 'All developments',

  careers_eyebrow: 'Careers · People & Opportunities',
  careers_title: 'Build the Future. Shape Libya. Grow With Purpose.',
  careers_text: 'At ENMAA, your ambition meets a greater purpose. Join us in shaping vibrant communities, creating transformative destinations, and building a sustainable future for Libya.',
  view_vacancies: 'View Current Vacancies', join_team: 'Join Our Team',
  commitment_label: 'Our Commitment',
  commitment_text: 'ENMAA is committed to attracting, developing, and retaining talented individuals who share our values and vision. We welcome applications from qualified candidates who are passionate about making a meaningful contribution and growing their careers with us.',
  vacancies_label: 'Current Vacancies', vacancies_title: 'Current Vacancies',
  search_roles: 'Search positions', all_departments: 'All departments', all_cities: 'All cities',
  col_position: 'Position', col_department: 'Department', col_city: 'City', col_posted: 'Posted', apply: 'Apply',
  no_vacancies: 'There are no open vacancies right now. You are welcome to send a general application below.',
  no_match: 'No positions match your search.',
  join_title: 'Join Our Team', join_text: 'Send us your details and CV. We read every application.',
  first_name: 'First Name', last_name: 'Last Name', email: 'Email Address', position: 'Position Applying For',
  general_application: 'General application', choose: 'Choose…', cv: 'Attach Resume / CV', cv_hint: 'PDF or DOCX, max 5 MB',
  cv_drop: 'Choose a file',

  vendors_eyebrow: 'Vendors · Consultants, Contractors & Suppliers', vendors_title: 'ENMAA Vendors',
  vendors_text: 'Companies interested in working with ENMAA are required to complete the vendor registration questionnaire available through the following link:',
  vendor_form_btn: 'Vendor Pre-Qualification Form',
  who_label: 'Who can register', who_title: 'Who can register',
  disc_1: 'Design Consultancy', disc_1_text: 'Architecture, urban design, landscape and interior design firms.',
  disc_2: 'Engineering', disc_2_text: 'Civil, structural, MEP, infrastructure and specialist engineering.',
  disc_3: 'Contracting', disc_3_text: 'Main contractors and specialist subcontractors for building and infrastructure works.',
  disc_4: 'Supply', disc_4_text: 'Manufacturers and suppliers of materials, systems and equipment.',
  disc_5: 'Services', disc_5_text: 'Facility, consultancy, professional and support services.',
  prepare_label: 'Before you start', prepare_title: 'Prepare before you start',
  doc_1: 'Commercial registration', doc_2: 'Company profile', doc_3: 'Licences', doc_4: 'Project references', doc_5: 'Insurance', doc_6: 'Authorised contacts',
  register_label: 'Registration', register_title: 'Register through the official form',
  register_text: 'Contracting follows the same Vendor Pre-Qualification form. The Vendors page therefore has one registration route for consultants, contractors and suppliers.',
  step_1: 'Open the Vendor Pre-Qualification Form (it opens in a new tab).',
  step_2: 'Complete the questionnaire and attach the requested documents.',
  step_3: 'Your responses go directly to the ENMAA Tendering team, who will follow up.',

  inv_eyebrow: 'Investors', inv_title: 'Invest in Libya’s Future',
  inv_text: 'Large-scale developments that transform into lasting value, socially, economically and nationally.',
  purpose_label: 'Our purpose', purpose_title: 'To Unlock the True Potential of Libya',
  purpose_text: 'To shape Libya’s future through destinations that reflect its potential, unlock its opportunities and inspire a new national narrative. We’re here to accelerate the country’s urban and economic growth by delivering large-scale developments that transform into lasting value, socially, economically and nationally.',
  sectors_label: 'Opportunity sectors', sectors_title: 'Where you can invest',
  sector_residential: 'Residential', sector_commercial: 'Commercial', sector_hospitality: 'Hospitality', sector_mixed: 'Mixed-Use',
  sector_residential_text: 'Communities and residences for a growing population.',
  sector_commercial_text: 'Offices, retail and business districts.',
  sector_hospitality_text: 'Hotels, resorts and leisure destinations.',
  sector_mixed_text: 'Districts that combine living, work and leisure.',
  sector_cta: 'Register interest',
  interest_title: 'Register your interest', interest_text: 'Tell us what you are looking for and our investment team will contact you in your preferred language.',
  sector: 'Sector of interest', investment_range: 'Investment range', preferred_language: 'Preferred language',

  contact_eyebrow: 'Contact', contact_title: 'Get in touch', contact_text: 'Questions about ENMAA, our developments or partnerships? Send us a message.',
  contact_details: 'Contact details', address: 'Address', phone: 'Phone', subject: 'Subject',

  full_name: 'Full Name', organisation: 'Organisation', country: 'Country', message: 'Message',
  consent: 'I agree that ENMAA may store and use the information I provide to respond to this request, as described in the Privacy Policy.',
  send: 'Send', submit_application: 'Submit Application', sending: 'Sending…',
  required: 'Required', optional: 'optional',
  form_success: 'Thank you. Your message has been received and our team will be in touch.',
  form_success_career: 'Thank you for applying. HR has received your application.',
  form_error: 'Something went wrong. Please check the form and try again.',
  err_required: 'This field is required.', err_email: 'Enter a valid email address.', err_consent: 'Please accept to continue.',
  err_file: 'Attach a PDF or DOCX file up to 5 MB.', err_rate: 'Too many submissions. Please try again later.',

  not_found_title: 'Page not found', not_found_text: 'The page you are looking for does not exist.', go_home: 'Back to home',
  legal_privacy: 'Privacy Policy', legal_terms: 'Terms of Use', legal_accessibility: 'Accessibility',
  meta_description: 'ENMAA is a master developer shaping Libya’s future through districts, destinations and developments built for progress.',
};

const ar = {
  site_name: 'إنماء',
  nav_home: 'الرئيسية', nav_developments: 'مشاريعنا', nav_careers: 'الوظائف', nav_vendors: 'الموردون', nav_investors: 'المستثمرون',
  menu: 'القائمة', close: 'إغلاق', pause_slideshow: 'إيقاف العرض', play_slideshow: 'تشغيل العرض', skip: 'الانتقال إلى المحتوى', language: 'اللغة',

  footer_company: 'الشركة', footer_about: 'من نحن', footer_news: 'الأخبار', footer_contact: 'تواصل معنا',
  footer_explore: 'استكشف', footer_work: 'اعمل معنا', footer_vendor_reg: 'تسجيل الموردين',
  privacy: 'الخصوصية', terms: 'الشروط', accessibility: 'إمكانية الوصول', rights: 'جميع الحقوق محفوظة.',

  hero_eyebrow: 'مطوّر رئيسي · ليبيا',
  hero_title: 'نصنع مستقبل ليبيا',
  hero_text: 'رؤية عالمية لإمكانات محلية: أحياء ووجهات ومشاريع تُبنى من أجل التقدّم.',
  hero_cta: 'استكشف مشاريعنا', hero_explore: 'استكشف', hero_story: 'قصتنا', scroll: 'مرّر', prev_slide: 'الشريحة السابقة', next_slide: 'الشريحة التالية',
  type_1: 'مجتمعات مخططة', type_2: 'أحياء تجارية', type_3: 'واجهات بحرية', type_4: 'متعددة الاستخدامات',
  type_1_text: 'أحياء مخططة حول الإنسان والحدائق والحياة اليومية.',
  type_2_text: 'أحياء أعمال مصممة لاستقطاب المؤسسات والاستثمار.',
  type_3_text: 'وجهات ساحلية تربط المدن بالبحر.',
  type_4_text: 'أماكن يلتقي فيها السكن والعمل والترفيه.',

  label_we_are: 'نحن إنماء',
  we_are_title: 'مطوّر رئيسي يرسم مستقبل ليبيا، حيًّا بعد حيّ، ووجهةً بعد وجهة.',
  we_are_text: 'في كل حي ووجهة ومشروع، نوظّف فكرًا عالميًا لخدمة إمكانات محلية تعكس غنى الأرض وطموح المستقبل. نعمل على تحقيق التقدّم على نطاق واسع، وعلى تقديم ليبيا للعالم من خلال جودة ما نبنيه.',
  about_more: 'عن إنماء',

  label_developments: 'مشاريعنا', all_developments: 'جميع المشاريع', view_project: 'عرض المشروع',
  label_what_we_do: 'ما نقوم به', what_we_do_title: 'أماكن تُبنى للتقدّم',
  label_values: 'ما يوجّهنا', values_title: 'قيمنا',
  value_1: 'رؤية هادفة', value_1_text: 'لا نكتفي بالبناء، بل نرسم الرؤية. تبدأ كل وجهة بنظرة بعيدة المدى تنطلق من احتياجات الناس الحقيقية وإمكانات الوطن.',
  value_2: 'أثر جماعي', value_2_text: 'نؤمن بقوة التعاون بين الناس والمؤسسات والمدن لصنع مستقبل مشترك أفضل.',
  value_3: 'الإنسان أولًا', value_3_text: 'يبدأ كل قرار بالتفكير في الإنسان: كيف يتنقل ويتواصل ويشعر ويزدهر في الأماكن التي نصنعها.',
  value_4: 'استشراف المستقبل', value_4_text: 'نفكر على المدى البعيد ونعمل بهدف. صُممت مشاريعنا لتحفيز النمو وفتح آفاق الفرص ووضع معايير جديدة للحياة الحضرية.',
  value_5: 'التميّز معيارنا', value_5_text: 'معيارنا عالمي. نُنجز بدقة، ونصمم بطموح، وننفذ بانضباط، لضمان جودة عالمية في كل التفاصيل.',
  label_news: 'الأخبار والمستجدات', news_title: 'آخر الأخبار', all_news: 'كل الأخبار', read_more: 'اقرأ المزيد', back_to_news: 'العودة إلى الأخبار',
  no_news: 'ستُنشر الأخبار هنا قريبًا.', news_prev: 'الخبر السابق', news_next: 'الخبر التالي', news_drag: 'اسحب أو استخدم الأسهم للتصفّح', open_full_story: 'فتح الصفحة كاملة', copy_link: 'نسخ الرابط', link_copied: 'تم نسخ الرابط',
  label_partners: 'شركاؤنا', label_find_way: 'اعمل مع إنماء', find_way_title: 'اختر طريقك',
  path_invest: 'استثمر', path_invest_eyebrow: 'للمستثمرين', path_invest_text: 'استكشف الفرص في أنحاء ليبيا وسجّل اهتمامك.', path_invest_cta: 'علاقات المستثمرين',
  path_vendors: 'الموردون', path_vendors_eyebrow: 'للشركات', path_vendors_text: 'سجّل شركتك الاستشارية أو شركة المقاولات أو التوريد لدى إنماء.', path_vendors_cta: 'سجّل شركتك',
  path_careers: 'الوظائف', path_careers_eyebrow: 'للأفراد', path_careers_text: 'ابنِ مسيرتك المهنية وأنت تشارك في صنع أماكن ليبيا المستقبلية.', path_careers_cta: 'الوظائف المتاحة',

  kw_label: 'استكشف', kw_title: 'ابحث عن مكانك', kw_intro: 'اختر ما يهمك. يتشكّل النموذج مع كل اختيار، وتظهر عليه المشاريع التي تجمع كل ما اخترته.',
  kw_start: 'اختر خيارًا أو أكثر للبدء.', kw_matches: '{n} مشروعًا يجمع كل ما اخترته', kw_matches_one: 'مشروع واحد يجمع كل ما اخترته', kw_matches_two: 'مشروعان يجمعان كل ما اخترته', kw_matches_few: '{n} مشاريع تجمع كل ما اخترته', kw_none: 'لا يوجد مشروع يجمع كل هذه الخيارات بعد. جرّب إزالة أحدها.',
  kw_clear: 'مسح', kw_open: 'اكتشف ما يحتويه', kw_full: 'فتح الصفحة الكاملة', kw_hint: 'اسحب لتدوير النموذج',
  filter_all: 'الكل', filter_city: 'المدينة', filter_explore_label: 'استكشف حسب', filter_explore_title: 'ماذا تبحث عن؟', filter_show_all: 'عرض جميع المشاريع',
  dev_no_results: 'لا توجد مشاريع تطابق هذه الفلاتر.',
  dev_hero_title: 'مشاريعنا', dev_hero_text: 'استكشف الأماكن التي تكتب الفصل القادم من قصة ليبيا.',
  developments_count: '{n} مشروعًا', developments_count_one: 'مشروع واحد', developments_count_two: 'مشروعان', developments_count_few: '{n} مشاريع',
  fact_location: 'الموقع', fact_type: 'النوع', fact_area: 'مساحة الموقع', fact_masterplanner: 'المخطط الرئيسي',
  download_brochure: 'تحميل الكتيّب', register_interest: 'سجّل اهتمامك',
  tab_overview: 'نظرة عامة', tab_story: 'التجربة', tab_gallery: 'معرض الصور', tab_enquire: 'استفسار',
  gallery: 'معرض الصور', label_render: 'تصوّر', label_lifestyle: 'نمط حياة', label_photo: 'صورة',
  project_enquiry_title: 'استفسر عن هذا المشروع', project_enquiry_text: 'اترك بياناتك وسيتواصل معك فريقنا.',
  other_developments: 'مشاريع أخرى', all_developments_link: 'جميع المشاريع',

  careers_eyebrow: 'الوظائف · الأفراد والفرص',
  careers_title: 'ابنِ المستقبل. شارك في تشكيل ليبيا. وانمُ بهدف.',
  careers_text: 'في إنماء، يلتقي طموحك بهدف أسمى. انضم إلينا لنبني معًا مجتمعات نابضة بالحياة، ونصنع وجهات تُحدث التحوّل، ونرسي مستقبلًا مستدامًا لليبيا.',
  view_vacancies: 'عرض الوظائف الشاغرة', join_team: 'انضم إلى فريقنا',
  commitment_label: 'التزامنا',
  commitment_text: 'تلتزم إنماء باستقطاب الكفاءات الموهوبة التي تشاركنا قيمنا ورؤيتنا، وبتطويرها والمحافظة عليها. ونرحّب بطلبات المرشحين المؤهلين الشغوفين بتقديم إسهام حقيقي وتنمية مسيرتهم المهنية معنا.',
  vacancies_label: 'الوظائف الشاغرة', vacancies_title: 'الوظائف الشاغرة',
  search_roles: 'ابحث عن وظيفة', all_departments: 'كل الإدارات', all_cities: 'كل المدن',
  col_position: 'الوظيفة', col_department: 'الإدارة', col_city: 'المدينة', col_posted: 'تاريخ النشر', apply: 'تقدّم',
  no_vacancies: 'لا توجد وظائف شاغرة حاليًا. يمكنك إرسال طلب عام من خلال النموذج أدناه.',
  no_match: 'لا توجد وظائف تطابق بحثك.',
  join_title: 'انضم إلى فريقنا', join_text: 'أرسل إلينا بياناتك وسيرتك الذاتية. نقرأ كل طلب.',
  first_name: 'الاسم الأول', last_name: 'اسم العائلة', email: 'البريد الإلكتروني', position: 'الوظيفة المتقدَّم لها',
  general_application: 'طلب عام', choose: 'اختر…', cv: 'إرفاق السيرة الذاتية', cv_hint: 'PDF أو DOCX، بحد أقصى 5 ميغابايت',
  cv_drop: 'اختر ملفًا',

  vendors_eyebrow: 'الموردون · الاستشاريون والمقاولون والموردون', vendors_title: 'موردو إنماء',
  vendors_text: 'يتعيّن على الشركات الراغبة في العمل مع إنماء استكمال استبيان تسجيل الموردين المتاح عبر الرابط التالي:',
  vendor_form_btn: 'نموذج التأهيل المسبق للموردين',
  who_label: 'من يمكنه التسجيل', who_title: 'من يمكنه التسجيل',
  disc_1: 'الاستشارات التصميمية', disc_1_text: 'مكاتب العمارة والتصميم الحضري وتنسيق المواقع والتصميم الداخلي.',
  disc_2: 'الهندسة', disc_2_text: 'الهندسة المدنية والإنشائية والكهروميكانيكية والبنية التحتية والتخصصية.',
  disc_3: 'المقاولات', disc_3_text: 'المقاولون الرئيسيون ومقاولو الباطن المتخصصون في أعمال المباني والبنية التحتية.',
  disc_4: 'التوريد', disc_4_text: 'مصنّعو وموردو المواد والأنظمة والمعدات.',
  disc_5: 'الخدمات', disc_5_text: 'خدمات المرافق والاستشارات والخدمات المهنية والمساندة.',
  prepare_label: 'قبل أن تبدأ', prepare_title: 'جهّز قبل أن تبدأ',
  doc_1: 'السجل التجاري', doc_2: 'ملف الشركة', doc_3: 'التراخيص', doc_4: 'مراجع المشاريع', doc_5: 'التأمين', doc_6: 'جهات الاتصال المفوّضة',
  register_label: 'التسجيل', register_title: 'سجّل عبر النموذج الرسمي',
  register_text: 'تخضع التعاقدات لنموذج التأهيل المسبق ذاته، لذا توفّر صفحة الموردين مسار تسجيل واحدًا للاستشاريين والمقاولين والموردين.',
  step_1: 'افتح نموذج التأهيل المسبق للموردين (يُفتح في نافذة جديدة).',
  step_2: 'أكمل الاستبيان وأرفق المستندات المطلوبة.',
  step_3: 'تصل إجاباتك مباشرة إلى فريق العطاءات في إنماء الذي سيتابع معك.',

  inv_eyebrow: 'المستثمرون', inv_title: 'استثمر في مستقبل ليبيا',
  inv_text: 'مشاريع كبرى تتحول إلى قيمة مستدامة، اجتماعيًا واقتصاديًا ووطنيًا.',
  purpose_label: 'هدفنا', purpose_title: 'إطلاق إمكانات ليبيا الحقيقية',
  purpose_text: 'نسعى إلى صناعة مستقبل ليبيا من خلال وجهات تعكس إمكاناتها، وتفتح آفاق فرصها، وتلهم سردية وطنية جديدة. ونعمل على تسريع النمو العمراني والاقتصادي للبلاد عبر مشاريع كبرى تتحول إلى قيمة مستدامة، اجتماعيًا واقتصاديًا ووطنيًا.',
  sectors_label: 'قطاعات الفرص', sectors_title: 'أين يمكنك الاستثمار',
  sector_residential: 'سكني', sector_commercial: 'تجاري', sector_hospitality: 'ضيافة', sector_mixed: 'متعدد الاستخدامات',
  sector_residential_text: 'مجتمعات ومساكن لعدد سكان متنامٍ.',
  sector_commercial_text: 'مكاتب ومتاجر وأحياء أعمال.',
  sector_hospitality_text: 'فنادق ومنتجعات ووجهات ترفيهية.',
  sector_mixed_text: 'أحياء تجمع السكن والعمل والترفيه.',
  sector_cta: 'سجّل اهتمامك',
  interest_title: 'سجّل اهتمامك', interest_text: 'أخبرنا بما تبحث عنه وسيتواصل معك فريق الاستثمار بلغتك المفضلة.',
  sector: 'القطاع المهتم به', investment_range: 'نطاق الاستثمار', preferred_language: 'اللغة المفضلة',

  contact_eyebrow: 'تواصل معنا', contact_title: 'تواصل معنا', contact_text: 'لديك سؤال عن إنماء أو مشاريعنا أو الشراكات؟ أرسل إلينا رسالة.',
  contact_details: 'بيانات التواصل', address: 'العنوان', phone: 'الهاتف', subject: 'الموضوع',

  full_name: 'الاسم الكامل', organisation: 'المؤسسة', country: 'الدولة', message: 'الرسالة',
  consent: 'أوافق على أن تحفظ إنماء المعلومات التي أقدّمها وتستخدمها للرد على هذا الطلب، وفق ما توضحه سياسة الخصوصية.',
  send: 'إرسال', submit_application: 'إرسال الطلب', sending: 'جارٍ الإرسال…',
  required: 'مطلوب', optional: 'اختياري',
  form_success: 'شكرًا لك. تم استلام رسالتك وسيتواصل معك فريقنا.',
  form_success_career: 'شكرًا لتقدّمك. استلمت إدارة الموارد البشرية طلبك.',
  form_error: 'حدث خطأ ما. يُرجى مراجعة النموذج والمحاولة مرة أخرى.',
  err_required: 'هذا الحقل مطلوب.', err_email: 'أدخل بريدًا إلكترونيًا صحيحًا.', err_consent: 'يُرجى الموافقة للمتابعة.',
  err_file: 'أرفق ملف PDF أو DOCX بحجم لا يتجاوز 5 ميغابايت.', err_rate: 'محاولات كثيرة. يُرجى المحاولة لاحقًا.',

  not_found_title: 'الصفحة غير موجودة', not_found_text: 'الصفحة التي تبحث عنها غير موجودة.', go_home: 'العودة إلى الرئيسية',
  legal_privacy: 'سياسة الخصوصية', legal_terms: 'شروط الاستخدام', legal_accessibility: 'إمكانية الوصول',
  meta_description: 'إنماء مطوّر رئيسي يصنع مستقبل ليبيا من خلال أحياء ووجهات ومشاريع مبنية للتقدّم.',
};

const DICT = { en, ar };

// Texts edited in the dashboard ("Site texts"), loaded from the database.
let OVERRIDES = { en: {}, ar: {} };
function setOverrides(rows) {
  const o = { en: {}, ar: {} };
  for (const r of rows) {
    if (r.en) o.en[r.key] = r.en;
    if (r.ar) o.ar[r.key] = r.ar;
  }
  OVERRIDES = o;
}

// These keys only seed the editable lists (hero slides, values, sectors, ...),
// so they are edited there, not under Site texts.
const LIST_KEYS = /^(type_\d|value_\d|disc_\d|doc_\d|sector_(residential|commercial|hospitality|mixed))/;

// Groups for the Site texts screen, matched in order by key.
const GROUPS = [
  ['Navigation & footer', /^(site_name|nav_|menu$|close$|skip$|language$|footer_|privacy$|terms$|accessibility$|rights$|pause_|play_|meta_)/],
  ['Home', /^(hero_|scroll$|label_we_are|we_are_|label_partners|about_more|label_developments|all_developments$|view_project|label_what|what_we_do|label_values|values_title|label_news|news_title|all_news|read_more|back_to_news|no_news|news_|open_full_story|copy_link|link_copied|prev_slide|next_slide|label_find|find_way|path_)/],
  ['Developments', /^(kw_|filter_|dev_|developments_count|fact_|download_|register_interest|tab_|gallery$|label_render|label_lifestyle|label_photo|project_|other_dev|all_developments_link)/],
  ['Careers', /^(careers_|view_vac|join_|commitment|vacancies|search_roles|all_dep|all_cit|col_|apply$|no_vac|no_match|first_name|last_name|position$|general_app|choose$|cv)/],
  ['Vendors', /^(vendors_|vendor_form|who_|prepare_|register_(label|title|text)|step_)/],
  ['Investors', /^(inv_|purpose_|sectors_|sector_cta|interest_|sector$|investment_range|preferred_language)/],
  ['Contact & forms', /^(contact_|address$|phone$|subject$|email$|full_name|organisation|country|message$|consent|send$|submit_|sending|required|optional|form_|err_)/],
  ['Other pages', /.*/],
];

function textCatalog() {
  const groups = GROUPS.map(([name]) => ({ name, items: [] }));
  for (const key of Object.keys(en)) {
    if (LIST_KEYS.test(key)) continue;
    const gi = GROUPS.findIndex(([, re]) => re.test(key));
    groups[gi].items.push({
      key,
      default: { en: en[key], ar: ar[key] ?? '' },
      value: { en: OVERRIDES.en[key] ?? '', ar: OVERRIDES.ar[key] ?? '' },
    });
  }
  return groups.filter((g) => g.items.length);
}

// Plural form for a count: Arabic has one / two / few (3–10) / many; English one / other.
function pluralForm(lang, n) {
  if (n === 1) return 'one';
  if (lang === 'ar') {
    if (n === 2) return 'two';
    if (n % 100 >= 3 && n % 100 <= 10) return 'few';
  }
  return '';
}

function translator(lang) {
  const d = DICT[lang] || en;
  const o = OVERRIDES[lang] || {};
  const has = (k) => o[k] != null || d[k] != null;
  const t = (key, vars) => {
    let s = o[key] ?? d[key] ?? OVERRIDES.en[key] ?? en[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v);
    return s;
  };
  // t.plural('developments_count', 3) -> picks developments_count_few etc. when available.
  t.plural = (key, n) => {
    const form = pluralForm(lang, n);
    return t(form && has(`${key}_${form}`) ? `${key}_${form}` : key, { n });
  };
  // All forms of a plural text, for scripts that count in the browser.
  t.forms = (key) => Object.fromEntries(['', 'one', 'two', 'few'].map((f) => [f || 'other', t(f && has(`${key}_${f}`) ? `${key}_${f}` : key)]));
  return t;
}

// Pick the current language from a {en:{...}, ar:{...}} object, falling back to English.
function pick(t, lang, field) {
  const v = t?.[lang]?.[field];
  if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  return t?.en?.[field] ?? '';
}

module.exports = { LANGS, DIR, LANG_NAMES, translator, pick, pluralForm, setOverrides, textCatalog };
