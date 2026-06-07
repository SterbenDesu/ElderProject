// Bulgarian copy for VnukPodNaem.
//
// The whole Bulgarian set below is written natively (not translated word for
// word from English). It addresses Bulgarian families warmly and formally
// ("Вие" form throughout). Consistent terminology:
//   - "caregiver" / "helper"  -> "помощник"
//   - the platform name        -> "Внук под наем"
//   - service names            -> "Престой вкъщи", "Бързо посещение",
//                                 "Пазаруване", "Домакинска помощ",
//                                 "Компания", "Придружаване"
//
// IMPORTANT: every value here must stay identical to its counterpart in
// `phraseTranslations` for the same English source, because the runtime DOM
// translator re-checks already-rendered text. The shell/header values below
// are duplicated intentionally in `phraseTranslations`.

export const bg = {
  languageName: "Български",
  header: {
    languageLabel: "Език",
    signIn: "Вход",
    account: "Профил",
    switchTo: "Превключете на английски",
  },
  shell: {
    mainNavigationLabel: "Основна навигация",
    homeLabel: "Внук под наем — начало",
    menu: "Меню",
    navigationHeading: "Навигация",
    legalHeading: "Правна информация",
    footerDescription:
      "Платформа за доверена ежедневна помощ: посещения, дребни задачи, пазаруване, компания, домакински дела и придружаване. Всеки започва с обикновен профил, а помощниците стават видими публично едва след проверка от наш екип.",
    followUs: "Последвайте ни",
    marketplaceDisclaimer: "Технологична платформа — помощниците са независими.",
    closeMenu: "Затворете менюто",
    links: {
      home: "Начало",
      services: "Услуги",
      caregivers: "Помощници",
      safety: "Безопасност",
      becomeCaregiver: "Станете помощник",
      terms: "Условия",
      privacy: "Поверителност",
    },
  },
};

export const phraseTranslations: Record<string, string> = {
  // ---------------------------------------------------------------------------
  // Shared navigation, header, footer, shell
  // ---------------------------------------------------------------------------
  "Vnuk Pod Naem": "Внук под наем",
  "Vnuk Pod Naem home": "Внук под наем — начало",
  "Home": "Начало",
  "Services": "Услуги",
  "Caregivers": "Помощници",
  "Safety": "Безопасност",
  "Safety information": "Информация за безопасност",
  "Become a caregiver": "Станете помощник",
  "Sign in": "Вход",
  "Sign in.": "Вход.",
  "Sign up": "Регистрация",
  "Account": "Профил",
  "Menu": "Меню",
  "Close menu": "Затворете менюто",
  "Follow us": "Последвайте ни",
  "A technology marketplace — caregivers are independent.":
    "Технологична платформа — помощниците са независими.",
  "My profile": "Моят профил",
  "Browse caregivers": "Разгледайте помощниците",
  "Admin": "Администратор",
  "Sign out": "Изход",
  "Signing out…": "Излизане…",
  "Checking account…": "Зареждане на профила…",
  "Terms": "Условия",
  "Privacy": "Поверителност",
  "Language": "Език",
  "Navigation": "Навигация",
  "Legal": "Правна информация",
  "A marketplace for trusted everyday support: visits, errands, shopping, companionship, home tasks, and accompaniment. Everyone starts with a normal account, and caregivers appear publicly only after admin review.":
    "Платформа за доверена ежедневна помощ: посещения, дребни задачи, пазаруване, компания, домакински дела и придружаване. Всеки започва с обикновен профил, а помощниците стават видими публично едва след проверка от наш екип.",

  // ---------------------------------------------------------------------------
  // Homepage — hero
  // ---------------------------------------------------------------------------
  "Everyday family support": "Ежедневна грижа за семейството",
  "Find trusted support for the people you love.":
    "Намерете грижовна подкрепа за хората, до които Ви е сърце.",
  "Find trusted everyday support for the people you love.":
    "Доверена грижа за вашите близки, когато имат нужда от помощ.",
  "Calm, practical help with visits, companionship, shopping, errands, and home tasks — arranged through reviewed caregivers.":
    "Спокойна и практична помощ с посещения, компания, пазаруване, дребни задачи и домакинство — организирана чрез проверени помощници.",
  "Vnuk Pod Naem helps families find calm, practical help with visits, companionship, shopping, errands, home tasks, and accompaniment.":
    "Внук под наем помага на семействата да намерят спокоен и грижовен помощник за посещения, компания, пазаруване, дребни задачи у дома и придружаване на възрастните си близки.",
  "Explore services": "Вижте услугите",
  "Caregivers are reviewed before becoming visible. Some services are restricted for safety and legal reasons.":
    "Всеки помощник минава през проверка, преди профилът му да стане видим. Някои услуги са ограничени от съображения за безопасност и по законови причини.",

  // Homepage — how it works
  "How it works": "Как работи",
  "A simple path from need to next step":
    "Спокоен път от нуждата до следващата стъпка",
  "Describe the support you are looking for, then continue to caregiver listings without making a reservation too early.":
    "Посочете каква помощ търсите и разгледайте профилите на помощниците — без да бързате с резервация.",
  "The homepage keeps the first action easy: describe the support you are looking for, then continue to caregiver listings without making a reservation too early.":
    "Първата стъпка е лесна: посочете каква помощ търсите и разгледайте профилите на помощниците, без да бързате с резервация.",
  "Share the day you have in mind": "Посочете кога ви е удобно",
  "Choose a city, date or date range, and the everyday support that would make life easier.":
    "Изберете град, дата или период и вида ежедневна помощ, който ще облекчи деня на вашия близък.",
  "Browse reviewed caregivers": "Разгледайте проверените помощници",
  "Use the caregiver listings to compare visible profiles and find a calm, practical match for your family.":
    "Сравнете видимите профили и изберете спокоен и подходящ помощник за вашето семейство.",
  "Continue from your account": "Продължете от профила си",
  "Booking requests are handled after sign in. Final reservation and payment steps will come later.":
    "Заявките се изпращат след вход в профила. Окончателната резервация и плащането ще бъдат добавени по-късно.",

  // Homepage — popular services
  "Popular support types": "Често търсена помощ",
  "Everyday help that is easy to understand": "Ежедневна помощ, обяснена просто",
  "Clear, familiar service categories help older adults and families scan choices without feeling rushed.":
    "Ясните и познати категории помагат на възрастните хора и на семействата им да изберат спокойно, без напрежение.",
  "A steady presence at home with conversation and light practical help during a planned visit.":
    "Спокойно присъствие у дома — разговор и лека практична помощ по време на предварително уговорено посещение.",
  "A shorter check-in for company, simple errands, or a little help with the day.":
    "Кратка визита за компания, дребна задача или малко помощ в рамките на деня.",
  "Help with lists, store trips, and bringing back everyday essentials without extra stress.":
    "Помощ със списъка, обикалянето по магазините и носенето на покупките — без излишно притеснение.",
  "Light home tasks such as tidying, organizing, and small household support.":
    "Леки домакински дела като подреждане, организиране и дребна помощ из къщи.",
  "Friendly time for conversation, walks, hobbies, or simply staying socially connected.":
    "Време за разговор, разходка, любимо занимание или просто човешка компания.",
  "An extra person for appointments, offices, shops, or family visits when support helps.":
    "Един човек до вас при посещение при лекар, в институция, в магазина или при роднини, когато е добре да има придружител.",

  // Homepage — why families / trust band
  "Why families choose us": "Защо семействата избират нас",
  "Support that feels clear and easy to arrange":
    "Помощ, която е лесна за уговаряне",
  "Choose what you need, then continue step by step":
    "Изберете каква помощ ви трябва и продължете спокойно, стъпка по стъпка",
  "Review caregiver profiles, and move forward at a steady pace with clear next steps.":
    "Разгледайте профилите на помощниците и продължете напред спокойно, стъпка по стъпка.",
  "Choose services, review caregiver profiles, and move forward at a steady pace with clear next steps.":
    "Изберете услугите, разгледайте профилите на помощниците и продължете напред със спокойно темпо и ясни стъпки.",
  "Choose what you need, review caregiver profiles, and continue step by step.":
    "Избирате каква помощ ви трябва, разглеждате профилите и продължавате стъпка по стъпка.",
  "Reviewed profiles before visibility": "Първо проверка, после видим профил",
  "Caregiver profiles are reviewed before they become visible in the public listing.":
    "Профилите на помощниците минават през проверка, преди да станат видими в публичния списък.",
  "Simple service scope": "Ясен обхват на услугите",
  "Everyday support categories are kept understandable, with safety limits explained in dedicated pages.":
    "Категориите помощ са описани просто и разбираемо, а ограниченията са събрани в отделни страници.",

  // Homepage — become a caregiver band
  "Turn the time you give into trusted everyday support.":
    "Превърнете времето, което подарявате, в грижа, на която хората се доверяват.",
  "Everyone starts with a normal account. When you are ready to offer companionship, errands, or practical help, apply in minutes — caregivers become visible only after admin review.":
    "Всеки започва с обикновен профил. Когато сте готови да предложите компания, помощ с дребни задачи или практична подкрепа, кандидатствайте само за няколко минути — профилът Ви става видим едва след проверка от нашия екип.",
  "Everyone starts with a normal account. When you are ready to offer companionship, errands, or practical help, apply in minutes — caregivers become visible only after a calm admin review.":
    "Всеки започва с обикновен профил. Когато сте готови да предложите компания, помощ с дребни задачи или практична подкрепа, кандидатствайте само за няколко минути — профилът ви става видим едва след спокойна проверка от наш екип.",
  "Create your account": "Създайте профила си",
  "See how applying works": "Вижте как се кандидатства",

  // Homepage — calm safety note
  "Calm safety note": "Спокойна бележка за безопасност",
  "Clear boundaries, dedicated pages": "Ясни граници в отделни страници",
  "Clear boundaries without making the page feel heavy":
    "Ясни граници, поднесени спокойно",
  "Service limits are in dedicated safety and service scope pages so families can review them before sending a request.":
    "Ограниченията на услугите са описани в отделните страници за безопасност и обхват — прегледайте ги преди да изпратите заявка.",
  "Safety notes": "Бележки за безопасност",
  "Service scope": "Обхват на услугите",
  "Vnuk Pod Naem keeps service limits in dedicated safety and service scope pages so families can review them before sending a request.":
    "Внук под наем събира ограниченията в отделни страници за безопасност и обхват на услугите, за да можете да ги прегледате спокойно, преди да изпратите заявка.",
  "Read safety notes": "Прочетете за безопасността",
  "See service scope": "Вижте обхвата на услугите",

  // ---------------------------------------------------------------------------
  // Home search card
  // ---------------------------------------------------------------------------
  "Find support": "Намерете помощ",
  "What kind of help do you need?": "От каква помощ имате нужда?",
  "Choose one or more services, a city, and a date range. We’ll show caregivers using the information that is currently available.":
    "Изберете една или повече услуги, град и период. Ще ви покажем помощниците според наличната в момента информация.",
  "Service types": "Видове услуги",
  "Stay at home": "Престой вкъщи",
  "Quick visit": "Бързо посещение",
  "Shopping": "Пазаруване",
  "House work": "Домакинска помощ",
  "Companionship": "Компания",
  "Accompaniment": "Придружаване",
  "Start date": "Начална дата",
  "End date": "Крайна дата",
  "City": "Град",
  "Any listed city": "Всички градове",
  "Search caregivers": "Намерете помощник",

  // ---------------------------------------------------------------------------
  // Caregivers listing (/helpers)
  // ---------------------------------------------------------------------------
  "Certified caregivers": "Проверени помощници",
  "Browse approved caregiver profiles for everyday support. Longer profile information is available on each caregiver page.":
    "Разгледайте одобрените профили на помощници за ежедневна помощ. По-подробна информация ще намерите в страницата на всеки помощник.",
  "Before you choose a caregiver": "Преди да изберете помощник",
  "Caregiver profiles are reviewed before they appear here. Only approved and visible profiles are listed; final reservation and payment steps are not active yet, and some services have safety or legal limits.":
    "Профилите на помощниците минават през проверка, преди да се появят тук. Показват се само одобрени и видими профили; окончателната резервация и плащането все още не са активни, а някои услуги имат ограничения за безопасност или по законови причини.",
  "Selected search": "Избрано търсене",
  "Caregiver search criteria": "Критерии за търсене",
  "Change search": "Променете търсенето",
  "Service": "Услуга",
  "Any service": "Всяка услуга",
  "Not selected": "Не е посочено",
  "Showing caregivers matching available profile data. Date and service availability filtering will be added later.":
    "Показваме помощниците според наличните данни в профилите. Филтрирането по дата и реална заетост ще бъде добавено по-късно.",
  "Loading certified caregivers…": "Зареждане на помощниците…",
  "No certified caregivers to show yet": "Все още няма помощници за показване",
  "No caregivers are available in your area yet. Check back soon.":
    "Все още няма налични помощници във вашия район. Заповядайте отново скоро.",
  "No caregivers are available in": "Все още няма налични помощници в",
  "yet. Check back soon.": "за момента. Заповядайте отново скоро.",
  "Back to homepage": "Към началната страница",
  "Certified caregiver": "Проверен помощник",
  "Caregiver in": "Помощник в",
  "Location": "Населено място",
  "Age": "Възраст",
  "Age not added": "Възрастта не е посочена",
  "Experience": "Опит",
  "View profile": "Вижте профила",
  "We couldn't load caregivers right now. Please try again in a little while.":
    "В момента не можем да заредим помощниците. Моля, опитайте отново малко по-късно.",
  "We couldn't load this caregiver right now. Please try again in a little while.":
    "В момента не можем да заредим този помощник. Моля, опитайте отново малко по-късно.",

  // ---------------------------------------------------------------------------
  // Caregiver profile (/helpers/[id])
  // ---------------------------------------------------------------------------
  "Caregiver profile": "Профил на помощник",
  "Review the caregiver profile details. Private contact information, applications, and admin-only fields are not shown publicly.":
    "Разгледайте данните в профила на помощника. Личните контакти, кандидатурите и служебните полета не се показват публично.",
  "Loading caregiver profile…": "Зареждане на профила на помощника…",
  "Caregiver unavailable": "Помощникът не е наличен",
  "Back to certified caregivers": "Обратно към помощниците",
  "Service radius": "Радиус на работа",
  "Not listed": "Не е посочено",
  "Full profile": "Повече за помощника",
  "Non-medical service boundary": "Какво включва помощта",
  "Vnuk Pod Naem helpers may be requested for companionship, errands, shopping, walks, check-ins, technology help, and accompaniment. Do not request medical care, medication management, clinical tasks, card PINs, passwords, cash handling, or access to valuables. Helpers are independent marketplace participants, not Vnuk Pod Naem employees, and the platform does not guarantee absolute safety.":
    "Помощниците във Внук под наем могат да помогнат с компания, дребни задачи, пазаруване, разходки, кратки посещения, помощ с техника и придружаване. Не отправяйте заявки за медицинска грижа, даване на лекарства, медицински процедури, ПИН кодове, пароли, боравене с пари в брой или достъп до ценности. Помощниците са самостоятелни участници в платформата, а не служители на Внук под наем, и платформата не гарантира абсолютна безопасност.",
  "Request this caregiver": "Заявете този помощник",
  "A request saves this caregiver profile with status Requested. No payment is collected, and caregiver acceptance is not implemented yet.":
    "Заявката запазва този помощник със статус „Заявена“. Не се събира плащане, а потвърждението от помощника все още не е активно.",
  "Checking your login session…": "Проверка на профила ви…",
  "Login required": "Необходим е вход",
  "Sign in with a normal account before requesting a caregiver.":
    "Влезте с обикновен профил, преди да заявите помощник.",
  "Login": "Вход",
  "Create account": "Създайте профил",
  "Profile setup needed": "Профилът трябва да се настрои",
  "Open dashboard": "Отворете профила",
  "Client/caregiver access only": "Достъп само за потребителски профили",
  "Booking requests are for client/caregiver accounts. Your current role is":
    "Заявките са достъпни за обикновените потребителски профили. В момента вашата роля е",
  "Return to dashboard": "Обратно към профила",
  "View your booking requests": "Вижте заявките си",
  "Elderly profile required": "Нужен е профил на близък",
  "Create an elderly profile before requesting this helper.":
    "Създайте профил на близък човек, преди да заявите този помощник.",
  "Manage elderly profiles": "Управление на профилите на близки",
  "No allowed service categories": "Няма налични категории услуги",
  "Booking requests need an allowed service category. Confirm the database seed data and service_categories RLS policy are applied.":
    "Заявките изискват разрешена категория услуга. Проверете дали началните данни и RLS политиката за service_categories са приложени.",
  "Elderly profile": "Профил на близък",
  "Select an elderly profile": "Изберете профил на близък",
  "Allowed service category": "Категория услуга",
  "Select a non-medical service category": "Изберете категория ежедневна помощ",
  "Requested start date and time": "Желана дата и час",
  "Requested duration in minutes": "Желана продължителност (в минути)",
  "Notes for non-medical support": "Бележки за помощта",
  "Keep notes practical and non-medical, such as timing, communication preferences, routine errands, or companionship context. Do not enter medical details, diagnoses, medication instructions, card PINs, passwords, cash-handling requests, or access-to-valuables requests.":
    "Опишете практични неща — удобни часове, начин на общуване, обичайни задачи или повод за компания. Не въвеждайте медицински данни, диагнози, указания за лекарства, ПИН кодове, пароли, искания за боравене с пари или достъп до ценности.",
  "Creating request…": "Изпращане на заявката…",
  "What happens next": "Какво следва",
  "• The booking is saved with status Requested.":
    "• Заявката се запазва със статус „Заявена“.",
  "• The selected visible helper profile is stored on the booking.":
    "• Избраният видим профил на помощник се запазва към заявката.",
  "• Helper acceptance, final confirmation, and payment are later phases.":
    "• Потвърждението от помощника, окончателното потвърждение и плащането предстоят в следващ етап.",
  "• No card details or payment information are collected here.":
    "• Тук не се събират данни за карта или плащане.",
  "Public data only": "Само публични данни",
  "This page uses safe caregiver profile fields only: display name, bio, experience, and verification label. It does not show email addresses, private user details, profile ownership IDs, application answers, or hidden/admin-only fields.":
    "Тази страница показва само безопасните полета от профила: показвано име, описание, опит и етикет за проверка. Тук не се показват имейл адреси, лични данни, идентификатори на собственика, отговори от кандидатурата или скрити служебни полета.",
  // setMessage / status (caregiver profile)
  "This helper profile is not available publicly. It may be hidden, unverified, or missing.":
    "Този профил на помощник не е публично достъпен. Възможно е да е скрит, непроверен или да не съществува.",
  "This helper profile is not available publicly, so a request cannot be created.":
    "Този профил на помощник не е публично достъпен, затова не може да се създаде заявка.",
  "Your auth account is signed in, but the profiles table row is missing. Open the dashboard to complete profile setup before requesting a helper.":
    "Влезли сте в профила си, но липсва запис в таблицата с профили. Отворете профила, за да завършите настройката, преди да заявите помощник.",
  "Booking requests for a specific helper are only available to client/caregiver accounts.":
    "Заявките към конкретен помощник са достъпни само за обикновените потребителски профили.",
  "Create at least one elderly profile before requesting this helper.":
    "Създайте поне един профил на близък човек, преди да заявите този помощник.",
  "No allowed service categories are available. Confirm the service_categories seed data and RLS policy are applied.":
    "Няма налични разрешени категории услуги. Проверете дали началните данни за service_categories и RLS политиката са приложени.",
  "Elderly profile, service category, city, and requested start date/time are required.":
    "Профил на близък, категория услуга, град и желана начална дата/час са задължителни.",
  "Requested duration must be a positive number of minutes.":
    "Желаната продължителност трябва да е положителен брой минути.",
  "Requested start date/time is not valid. Please choose a date and time from the picker.":
    "Желаната начална дата/час не е валидна. Моля, изберете дата и час от полето.",
  "This helper is no longer visible or verified publicly, so the request was not created.":
    "Този помощник вече не е видим или проверен публично, затова заявката не беше създадена.",
  "Request saved with status Requested for this visible helper. Helper acceptance, final confirmation, and payment are not implemented yet.":
    "Заявката към този видим помощник е запазена със статус „Заявена“. Потвърждението от помощника, окончателното потвърждение и плащането все още не са активни.",

  // ---------------------------------------------------------------------------
  // Login page
  // ---------------------------------------------------------------------------
  "Account access": "Достъп до профила",
  "Enter your profile": "Влезте в профила си",
  "Use your email and password to open your profile, browse caregivers, and manage your account actions.":
    "Използвайте имейла и паролата си, за да отворите профила си, да разгледате помощниците и да управлявате действията в профила.",
  "Email": "Имейл",
  "Password": "Парола",
  "Signing in…": "Влизане…",
  "Forgot password?": "Забравена парола?",
  "Email or phone": "Имейл или телефон",
  "Check reset options": "Вижте възможностите за възстановяване",
  "Password reset is not active yet. For testing, use your email/password account.":
    "Възстановяването на парола все още не е активно. За тест влезте с имейл и парола.",
  "Need an account?": "Нямате профил?",
  "After signing in": "След като влезете",
  "• The header shows your avatar initials menu.":
    "• В горната лента се показва меню с инициалите ви.",
  "• My profile is your account hub for family and caregiver actions.":
    "• „Моят профил“ е мястото за семейните действия и за кандидатстване като помощник.",
  "• Password reset is a placeholder and does not send emails yet.":
    "• Възстановяването на парола е само заготовка и все още не изпраща имейли.",

  // ---------------------------------------------------------------------------
  // Signup page
  // ---------------------------------------------------------------------------
  "Join Vnuk Pod Naem": "Регистрация във Внук под наем",
  "Create a normal account first. If you want to offer support as a caregiver, you can apply later from your profile after signing in.":
    "Първо създайте обикновен профил. Ако искате да предлагате помощ като помощник, можете да кандидатствате по-късно от профила си, след като влезете.",
  "One profile for families and caregivers":
    "Един профил — и за семействата, и за помощниците",
  "First name": "Име",
  "Last name": "Фамилия",
  "Phone number": "Телефон",
  "Gender": "Пол",
  "Select gender": "Изберете пол",
  "Woman": "Жена",
  "Man": "Мъж",
  "Non-binary": "Небинарен",
  "Prefer not to say": "Предпочитам да не посочвам",
  "Repeat password": "Повторете паролата",
  "I accept the": "Приемам",
  "and": "и",
  "Privacy Policy": "Политиката за поверителност",
  "Creating account…": "Създаване на профила…",
  "Create my account": "Създайте профила ми",
  "Already have an account?": "Вече имате профил?",
  "Caregiver applications": "Кандидатстване като помощник",
  "• Signup no longer asks you to choose a role.":
    "• При регистрация вече не се избира роля.",
  "• New accounts are created as normal user profiles.":
    "• Новите профили се създават като обикновени потребителски профили.",
  "• To become a caregiver, sign in and use the application flow from My profile or the avatar menu.":
    "• За да станете помощник, влезте и кандидатствайте от „Моят профил“ или от менюто с профила.",
  "• Gender is saved in Supabase auth metadata for now; the database profile table does not have a gender column.":
    "• Полът засега се пази в данните за вход на Supabase; таблицата с профили все още няма поле за пол.",
  "Password and repeat password must match.":
    "Паролата и повторената парола трябва да съвпадат.",
  "You must accept the Terms and Privacy Policy before creating an account.":
    "Трябва да приемете Условията и Политиката за поверителност, преди да създадете профил.",
  "Signup may have succeeded, but Supabase did not return the user details needed to create the database profile. Please log in and use the profile retry path, or contact support.":
    "Регистрацията може да е успешна, но Supabase не върна нужните данни за създаване на профила в базата. Моля, влезте и опитайте отново настройката на профила или се свържете с поддръжката.",
  "Signup complete. Your account and profile were saved. If email confirmation is enabled, check your email before signing in.":
    "Готово! Профилът ви е създаден и записан. Ако е включено потвърждение по имейл, проверете пощата си, преди да влезете.",

  // ---------------------------------------------------------------------------
  // Caregiver application (/helper/apply)
  // ---------------------------------------------------------------------------
  "Caregiver application": "Кандидатура за помощник",
  "Apply to become a caregiver": "Кандидатствайте за помощник",
  "Submit a caregiver application for admin review. If approved, your caregiver profile can appear on the certified caregivers list.":
    "Изпратете кандидатура за помощник, която ще бъде прегледана от нашия екип. Ако бъде одобрена, профилът ви може да се появи в списъка с проверени помощници.",
  "Before you submit": "Преди да изпратите",
  "Application review": "Преглед на кандидатурата",
  "You keep a normal account while applying.":
    "Докато кандидатствате, профилът ви остава обикновен.",
  "Admins review submitted caregiver applications.":
    "Нашият екип преглежда подадените кандидатури.",
  "Approval is required before a caregiver profile can appear publicly.":
    "Нужно е одобрение, преди профилът на помощник да стане публичен.",
  "Safety and service boundaries": "Безопасност и граници на услугите",
  "Non-medical support only.": "Само ежедневна, немедицинска помощ.",
  "No medication management.": "Без даване и управление на лекарства.",
  "No injections.": "Без инжекции.",
  "No wound care.": "Без обработка на рани.",
  "No clinical tasks.": "Без медицински процедури.",
  "No cash handling.": "Без боравене с пари в брой.",
  "No card PINs or passwords.": "Без ПИН кодове на карти и пароли.",
  "No access-to-valuables requests.": "Без достъп до ценности.",
  "Checking your session and helper application…":
    "Проверка на профила и кандидатурата ви…",
  "Supabase configuration needed": "Необходима е настройка на Supabase",
  "Sign in to submit an application": "Влезте, за да изпратите кандидатура",
  "Caregiver applications are connected to your normal account. Please sign in or create an account before saving a draft or submitting an application.":
    "Кандидатурите са свързани с обикновения ви профил. Моля, влезте или създайте профил, преди да запазите чернова или да изпратите кандидатура.",
  "Session message:": "Съобщение:",
  "Application cannot load yet": "Кандидатурата все още не може да се зареди",
  "Retry": "Опитайте отново",
  "Application details": "Данни за кандидатурата",
  "Signed in as": "Влезли сте като",
  "Your account remains a normal account during review.":
    "По време на прегледа профилът ви остава обикновен.",
  "Status:": "Статус:",
  "Not started": "Не е започната",
  "This application is no longer editable from the applicant page. Admin review happens separately, and applicants cannot approve themselves.":
    "Тази кандидатура вече не може да се редактира от страницата на кандидата. Прегледът от екипа е отделен и кандидатите не могат да одобряват сами себе си.",
  "Full name, city, and motivation are required before saving or submitting.":
    "Име, град и мотивация са задължителни, преди да запазите или изпратите.",
  "Cannot save because your profile row is missing. Open Dashboard and retry profile setup first.":
    "Запазването е невъзможно, защото липсва запис за профила ви. Отворете „Моят профил“ и първо опитайте отново настройката.",
  "Your login works, but your profile row is missing. Open Dashboard and use the profile setup retry after confirming the Supabase schema and RLS policies are applied.":
    "Входът работи, но липсва запис за профила ви. Отворете „Моят профил“ и опитайте отново настройката, след като се уверите, че схемата на Supabase и RLS политиките са приложени.",
  "Full name": "Име и фамилия",
  "Motivation": "Мотивация",
  "Experience summary": "Кратко за опита ви",
  "Availability summary": "Кратко за свободното ви време",
  "Saving draft…": "Запазване на черновата…",
  "Save draft": "Запазете чернова",
  "Submitting…": "Изпращане…",
  "Submit application": "Изпратете кандидатурата",
  "Draft saved.": "Черновата е запазена.",
  "Application submitted for future admin review. Approval is not guaranteed.":
    "Кандидатурата е изпратена за преглед от нашия екип. Одобрението не е гарантирано.",

  // ---------------------------------------------------------------------------
  // Services page
  // ---------------------------------------------------------------------------
  "Everyday support categories": "Видове ежедневна помощ",
  "Vnuk Pod Naem presents practical support types that families can understand quickly before creating a basic request. Each category is meant to describe ordinary, everyday help in a clear and limited way.":
    "Внук под наем показва практични видове помощ, които семействата лесно разбират, преди да направят заявка. Всяка категория описва обикновена ежедневна помощ — ясно и в разумни граници.",
  "Current service scope": "Какво включваме засега",
  "These service categories support the current test version. Families can browse support types and create basic requests, while live availability, helper acceptance, payments, disputes, ratings, and advanced marketplace workflows are not active yet.":
    "Тези категории са част от текущата тестова версия. Семействата могат да разглеждат видовете помощ и да правят основни заявки, докато реалната заетост, потвърждението от помощник, плащанията, споровете, оценките и по-сложните процеси все още не са активни.",
  "For detailed limits, review the Safety page.":
    "За подробните ограничения вижте страницата „Безопасност“.",
  "Companionship and conversation": "Компания и разговор",
  "Friendly visits, shared activities, reading together, or conversation that helps older adults feel connected.":
    "Приятелски посещения, общи занимания, четене заедно или разговор, които помагат на възрастния човек да не се чувства сам.",
  "Light errands": "Дребни задачи",
  "Small practical tasks such as picking up simple items, mailing something, or handling a short local errand.":
    "Малки практични задачи — вземане на нужни неща, изпращане на пратка или кратка задача наблизо.",
  "Shopping support": "Помощ с пазаруването",
  "Help planning a routine shopping list, accompanying someone to a shop, or carrying light everyday items.":
    "Помощ при подготовката на списъка, придружаване до магазина или носене на леки ежедневни покупки.",
  "Walks and outdoor accompaniment": "Разходки и придружаване навън",
  "Calm walks or accompaniment outside the home when the request is practical, planned, and comfortable for everyone.":
    "Спокойни разходки или придружаване извън дома, когато това е практично, предварително уговорено и удобно за всички.",
  "Friendly check-ins": "Кратки приятелски посещения",
  "Scheduled visits or calls that give families a simple way to arrange a warm everyday check-in.":
    "Уговорени посещения или обаждания, които дават на семейството лесен начин да организира топла ежедневна проверка.",
  "Basic technology help": "Помощ с техниката",
  "Help with simple phone, tablet, video-call, or app basics so an older adult can stay more connected.":
    "Помощ с основни неща по телефона, таблета, видеоразговорите или приложенията, за да поддържа възрастният човек по-лесна връзка с близките.",
  "Going with an older adult to appointments, offices, or local institutions as everyday support.":
    "Придружаване на възрастния човек до прегледи, институции или офиси като ежедневна подкрепа.",

  // ---------------------------------------------------------------------------
  // Safety page (tabs)
  // ---------------------------------------------------------------------------
  "Trust-focused boundaries": "Граници, които пазят доверието",
  "Review what can and cannot be requested before sending a support request.":
    "Вижте какво може и какво не бива да се заявява, преди да изпратите заявка.",
  "How requests stay practical": "Как заявките остават практични",
  "Some services are limited for safety and legal reasons. Use these in-page views to check what can be requested and what should not be requested.":
    "Някои услуги са ограничени от съображения за безопасност и по законови причини. Тук можете да проверите какво може и какво не бива да се заявява.",
  "Service scope views": "Изгледи за обхвата на услугите",
  "What helpers may support": "С какво могат да помогнат помощниците",
  "The first marketplace scope is limited to everyday support. Requests should be safe, practical, and manageable without clinical training.":
    "В началото платформата покрива само ежедневна помощ. Заявките трябва да са безопасни, практични и изпълними без медицинско обучение.",
  "Requests the platform must not accept": "Заявки, които платформата не приема",
  "Vnuk Pod Naem does not support unsafe medical, financial, credential, valuables-related, or off-platform transaction requests.":
    "Внук под наем не приема рискови заявки, свързани с медицински грижи, финанси, данни за достъп, ценности или плащания извън платформата.",
  "Keep requests simple": "Дръжте заявките прости",
  "If a request starts to involve health decisions, medication, emergency response, money access, passwords, valuables, or legal authority, it belongs outside this planned marketplace scope.":
    "Ако една заявка започне да включва здравни решения, лекарства, спешна реакция, достъп до пари, пароли, ценности или правни пълномощия, тя е извън обхвата на платформата.",
  "If in doubt, do not accept the request": "При съмнение — не приемайте заявката",
  "Future product flows should direct users toward appropriate professional, emergency, legal, or financial support when a request falls outside everyday assistance.":
    "В бъдеще платформата ще насочва хората към подходяща професионална, спешна, правна или финансова помощ, когато заявката излиза извън ежедневната подкрепа.",

  // ---------------------------------------------------------------------------
  // Allowed services page
  // ---------------------------------------------------------------------------
  "Allowed services": "Позволени услуги",
  "The first marketplace scope is limited to non-medical support and everyday assistance. Requests should be safe, practical, and manageable without clinical training.":
    "В началото платформата покрива само немедицинска и ежедневна помощ. Заявките трябва да са безопасни, практични и изпълними без медицинско обучение.",
  "Conversation, shared hobbies, reading together, or friendly presence.":
    "Разговор, общи занимания, четене заедно или просто приятелско присъствие.",
  "Simple local tasks that do not involve valuables, cash handling, or private credentials.":
    "Прости задачи наблизо, които не включват ценности, пари в брой или лични данни за достъп.",
  "Shopping lists, accompaniment, or carrying light items within practical limits.":
    "Списък за пазаруване, придружаване или носене на леки покупки в разумни граници.",
  "Walks": "Разходки",
  "Outdoor accompaniment for everyday walks, not medical supervision.":
    "Придружаване навън за ежедневни разходки, без медицинско наблюдение.",
  "Check-ins": "Кратки посещения",
  "Friendly scheduled check-ins within the current early booking-request shell.":
    "Приятелски уговорени посещения в рамките на текущата ранна версия за заявки.",
  "Technology help": "Помощ с техниката",
  "Basic device assistance without passwords, account takeover, or financial access.":
    "Основна помощ с устройства, без пароли, достъп до чужди профили или финансов достъп.",
  "Going along to appointments or institutions for everyday support, not clinical decisions.":
    "Придружаване до прегледи или институции като ежедневна помощ, без медицински решения.",

  // ---------------------------------------------------------------------------
  // Prohibited services page
  // ---------------------------------------------------------------------------
  "Prohibited services": "Забранени услуги",
  "Vnuk Pod Naem is not a medical care service and does not support unsafe financial, credential, valuables-related, or off-platform transaction requests.":
    "Внук под наем не е услуга за медицинска грижа и не приема рискови заявки, свързани с финанси, данни за достъп, ценности или плащания извън платформата.",
  "Medication management": "Управление на лекарства",
  "No administering, organizing, reminding as a medical responsibility, or changing medication routines.":
    "Без даване, подреждане, напомняне като медицинска отговорност или промяна на схемата на лекарствата.",
  "Injections or wound care": "Инжекции и обработка на рани",
  "No clinical procedures, dressing changes, injections, or treatment tasks.":
    "Без медицински процедури, смяна на превръзки, инжекции или лечебни дейности.",
  "Clinical or emergency tasks": "Медицински или спешни задачи",
  "No diagnosis, medical monitoring, emergency response, lifting beyond safe everyday support, or licensed care.":
    "Без поставяне на диагноза, медицинско наблюдение, спешна реакция, повдигане извън безопасната ежедневна помощ или лицензирана грижа.",
  "Cash handling": "Боравене с пари в брой",
  "No managing cash, collecting money, or making informal off-platform financial arrangements.":
    "Без управление на пари в брой, събиране на суми или неформални финансови уговорки извън платформата.",
  "Card PINs and passwords": "ПИН кодове и пароли",
  "No requests for bank card PINs, account passwords, one-time codes, or private credentials.":
    "Без искания за ПИН кодове на банкови карти, пароли, еднократни кодове или лични данни за достъп.",
  "Access to valuables": "Достъп до ценности",
  "No requests to access safes, jewelry, property documents, or other valuables.":
    "Без достъп до сейфове, бижута, документи за собственост или други ценности.",
  "Off-platform payments": "Плащания извън платформата",
  "No payment directions are active in this shell, and future payments should use an approved provider only.":
    "В тази версия няма активни указания за плащане, а бъдещите плащания ще минават само през одобрен доставчик.",
  "Future product flows should direct users toward appropriate professional, emergency, legal, or financial support when a request falls outside non-medical everyday assistance.":
    "В бъдеще платформата ще насочва хората към подходяща професионална, спешна, правна или финансова помощ, когато заявката излиза извън немедицинската ежедневна подкрепа.",

  // ---------------------------------------------------------------------------
  // Terms page
  // ---------------------------------------------------------------------------
  "Terms of Service placeholder": "Условия за ползване (проект)",
  "This page is a placeholder for future Terms of Service. It is not final legal text and should not be used for a public launch until reviewed by a qualified professional.":
    "Тази страница е проект за бъдещите Условия за ползване. Текстът не е окончателен правен документ и не бива да се използва при публично пускане, преди да бъде прегледан от квалифициран специалист.",
  "Draft only — legal review required before launch.":
    "Само проект — нужен е правен преглед преди пускане.",
  "Marketplace role": "Роля на платформата",
  "The planned product is a technology marketplace, not a medical provider, licensed care provider, employer, or safety guarantor.":
    "Планираният продукт е технологична платформа, а не медицински доставчик, лицензиран доставчик на грижи, работодател или гарант за безопасност.",
  "Current shell accounts": "Профили в текущата версия",
  "Supabase Auth and database-backed shell workflows may store test account/profile, booking-request, helper application, helper profile, and admin helper-review data when configured.":
    "Когато са настроени, Supabase Auth и работните процеси с база данни може да съхраняват тестови данни за профили, заявки, кандидатури за помощник, профили на помощници и преглед от екипа.",
  "Future payments": "Бъдещи плащания",
  "No payment processing, refunds, payout handling, payment-provider integration, helper acceptance, full booking lifecycle, disputes, chat, notifications, ratings, or subscriptions are implemented yet.":
    "Все още не са реализирани обработка на плащания, връщане на суми, изплащания, връзка с платежен доставчик, потвърждение от помощник, пълен цикъл на заявката, спорове, чат, известия, оценки или абонаменти.",

  // ---------------------------------------------------------------------------
  // Privacy page
  // ---------------------------------------------------------------------------
  "Privacy Policy placeholder": "Политика за поверителност (проект)",
  "This page is a placeholder for a future Privacy Policy. It is not final legal text and should not be used for launch until data collection, retention, security, and user rights are reviewed by qualified professionals.":
    "Тази страница е проект за бъдеща Политика за поверителност. Текстът не е окончателен правен документ и не бива да се използва при пускане, преди събирането на данни, съхранението, сигурността и правата на потребителите да бъдат прегледани от квалифицирани специалисти.",
  "Draft only — privacy and legal review required before launch.":
    "Само проект — нужен е преглед по поверителност и право преди пускане.",
  "Current data storage": "Какви данни се пазят сега",
  "When Supabase is configured, this database-backed shell may store test account, profile, booking, helper application, and helper profile data through Supabase Auth and database workflows.":
    "Когато Supabase е настроен, тази версия с база данни може да съхранява тестови данни за профили, заявки, кандидатури за помощник и профили на помощници чрез Supabase Auth и работните процеси в базата.",
  "Future scope": "Бъдещ обхват",
  "Terms and Privacy content is placeholder text for review; it should not be treated as final legal, privacy, retention, security, user-rights, or compliance guidance before launch.":
    "Текстовете на Условията и Поверителността са чернова за преглед; те не бива да се приемат за окончателно правно, поверително, техническо или съответстващо ръководство преди пускане.",
  "Sensitive information": "Чувствителна информация",
  "The product should avoid unnecessary health, financial, password, valuables, or credential information.":
    "Продуктът избягва събирането на излишна здравна, финансова информация, пароли, данни за ценности или други данни за достъп.",

  // ---------------------------------------------------------------------------
  // Dashboard (My profile)
  // ---------------------------------------------------------------------------
  "Account hub": "Профилен център",
  "Manage your account, family support details, caregiver application, and profile shortcuts from one place.":
    "Управлявайте профила си, данните за семейната помощ, кандидатурата за помощник и бързите връзки от едно място.",
  "Checking your account session…": "Проверка на профила ви…",
  "Please sign in": "Моля, влезте",
  "Sign in to view your profile, manage booking requests, or start a caregiver application.":
    "Влезте, за да видите профила си, да управлявате заявките си или да започнете кандидатура за помощник.",
  "What you can do": "Какво можете да правите",
  "• Browse caregivers and request everyday support.":
    "• Разглеждайте помощниците и заявявайте ежедневна помощ.",
  "• Save elderly profiles for family booking requests.":
    "• Запазвайте профили на близки за семейните заявки.",
  "• Apply to become a caregiver after account creation.":
    "• Кандидатствайте за помощник, след като създадете профил.",
  "Welcome": "Добре дошли",
  "• Standard account": "• Обикновен профил",
  "• Caregiver applicant": "• Кандидат за помощник",
  "• Verified caregiver": "• Проверен помощник",
  "• Admin": "• Администратор",
  "Loading your profile…": "Зареждане на профила ви…",
  "Profile setup needs attention": "Настройката на профила се нуждае от внимание",
  "Your auth account exists, but profile setup is incomplete. Use the retry button below after the database schema and RLS policies are applied.":
    "Профилът ви за вход съществува, но настройката не е завършена. Натиснете бутона по-долу, след като схемата на базата и RLS политиките са приложени.",
  "Retrying profile setup…": "Повторна настройка…",
  "Retry profile setup": "Опитайте отново настройката",
  "Cannot retry profile setup because the signed-in user email is unavailable.":
    "Повторната настройка е невъзможна, защото имейлът на влезлия потребител не е наличен.",
  "Phone": "Телефон",
  "Display name": "Име за показване",
  "Not set yet": "Все още не е въведено",
  "Created date": "Дата на създаване",
  "Account actions": "Действия с профила",
  "Use these shortcuts to browse support, manage family request details, or apply to become a caregiver.":
    "Използвайте тези бързи връзки, за да разгледате помощта, да управлявате данните за семейните заявки или да кандидатствате за помощник.",
  "Elderly profiles": "Профили на близки",
  "Bookings": "Заявки",
  "No caregiver application has been saved yet.":
    "Все още няма запазена кандидатура за помощник.",
  "The existing application flow is used for caregiver review. Admin approval is required before caregiver functionality is available.":
    "За прегледа се използва съществуващият процес за кандидатстване. Нужно е одобрение от нашия екип, преди да станат достъпни функциите за помощник.",
  "Open caregiver application": "Отворете кандидатурата за помощник",
  "Elderly profile count is not loaded yet.":
    "Броят на профилите на близки още не е зареден.",
  "Booking requests": "Заявки за помощ",
  "Booking request count is not loaded yet.":
    "Броят на заявките още не е зареден.",
  "You are approved as a caregiver. You can manage safe public helper profile fields; admins still control public visibility.":
    "Одобрени сте като помощник. Можете да управлявате безопасните публични полета на профила; видимостта се контролира от нашия екип.",
  "Manage caregiver profile": "Управление на профила на помощник",
  "Admin tools": "Административни инструменти",
  "Admin tools are visible only for admin profiles.":
    "Административните инструменти са видими само за административните профили.",
  "Open admin": "Отворете администрацията",
  "Profile direction": "Накратко за профила",
  "• Your profile is the account hub after login.":
    "• Профилът ви е основното място за действия след вход.",
  "• New users start with a standard account.":
    "• Новите потребители започват с обикновен профил.",
  "• Become a caregiver uses the existing application flow.":
    "• „Станете помощник“ използва съществуващия процес за кандидатстване.",
  "• Final reservation, scheduling, and payment steps are not active yet.":
    "• Окончателната резервация, графикът и плащането все още не са активни.",

  // ---------------------------------------------------------------------------
  // Admin dashboard
  // ---------------------------------------------------------------------------
  "Admin dashboard": "Административен панел",
  "Helper application review": "Преглед на кандидатурите за помощник",
  "Admin users can review helper applications, update review status, and control whether approved helper profiles are publicly visible on /helpers.":
    "Администраторите могат да преглеждат кандидатурите за помощник, да променят статуса на прегледа и да решават дали одобрените профили да са публично видими на /helpers.",
  "Checking your admin session...": "Проверка на административната сесия...",
  "Checking your profile role...": "Проверка на ролята в профила...",
  "Please log in": "Моля, влезте",
  "You need to log in with an admin account before viewing helper application review data.":
    "Трябва да влезете с административен профил, преди да видите данните за прегледа на кандидатурите.",
  "Access denied": "Достъпът е отказан",
  "Admin access needs attention": "Административният достъп се нуждае от внимание",
  "No admin application data is loaded for this account.":
    "За този профил не са заредени административни данни за кандидатурите.",
  "Dashboard sections": "Раздели на панела",
  "Helper applications": "Кандидатури за помощник",
  "Review submitted helper applications and make basic verification decisions.":
    "Преглеждайте подадените кандидатури и вземайте основни решения за проверка.",
  "Helper visibility": "Видимост на помощниците",
  "Manage whether approved helper profiles appear publicly on /helpers.":
    "Управлявайте дали одобрените профили на помощници да се показват публично на /helpers.",
  "Users/profiles overview": "Преглед на потребители и профили",
  "Placeholder for future support-safe profile lookup and account status tools.":
    "Заготовка за бъдещи инструменти за безопасно търсене на профили и проверка на статуса.",
  "Placeholder only. Booking management and booking payments are not implemented.":
    "Само заготовка. Управлението на заявките и плащанията по тях не са реализирани.",
  "Disputes": "Спорове",
  "Placeholder for future complaint and dispute review workflows.":
    "Заготовка за бъдещи процеси за разглеждане на жалби и спорове.",
  "Audit logs": "Журнал на действията",
  "Placeholder for future review of safety and moderation events.":
    "Заготовка за бъдещ преглед на събитията по безопасност и модерация.",
  "Applications": "Кандидатури",
  "Refresh": "Обновете",
  "No helper applications are available for review yet.":
    "Все още няма кандидатури за преглед.",
  "Approved helper visibility": "Видимост на одобрените помощници",
  "Only admins can make verified helper profiles public. Hidden helpers and unverified applicants do not appear on `/helpers`.":
    "Само администраторите могат да правят проверените профили публични. Скритите помощници и непроверените кандидати не се показват на `/helpers`.",
  "No approved helper profiles are available yet.":
    "Все още няма одобрени профили на помощници.",
  "Approved helper": "Одобрен помощник",
  "Email not available": "Няма наличен имейл",
  "Visible": "Видим",
  "Hidden": "Скрит",
  "Service radius:": "Радиус на работа:",
  "Saving...": "Запазване...",
  "Hide from /helpers": "Скрийте от /helpers",
  "Show on /helpers": "Покажете на /helpers",
  "Review details": "Подробности за прегледа",
  "Select an application to review, or wait for applicants to submit helper applications.":
    "Изберете кандидатура за преглед или изчакайте кандидатите да подадат своите.",
  "Not available through current profile read":
    "Не е достъпно при текущото четене на профила",
  "Current status": "Текущ статус",
  "Updated date": "Дата на обновяване",
  "Not provided": "Не е посочено",
  "Admin actions": "Административни действия",
  "Approving sets the application to approved, updates the related profile role to verified helper, and creates or updates a non-public helper profile with basic verification.":
    "Одобряването задава статус „Одобрена“, променя ролята на профила на проверен помощник и създава или обновява непубличен профил на помощник с основна проверка.",
  "Mark under review": "Маркирайте като „В преглед“",
  "Approve": "Одобрете",
  "Reject": "Отхвърлете",
  "Approved helpers remain hidden from `/helpers` until a separate safe visibility control sets `helper_profiles.is_visible = true`.":
    "Одобрените помощници остават скрити от `/helpers`, докато отделна настройка за видимост не зададе `helper_profiles.is_visible = true`.",

  // Application / verification status labels
  "Draft": "Чернова",
  "Submitted": "Подадена",
  "Under review": "В преглед",
  "Approved": "Одобрена",
  "Rejected": "Отхвърлена",
  "Applicant": "Кандидат",
  "Verified basic": "Основна проверка",
  "Trusted": "Доверен",
  "Suspended": "Спрян",
  "Banned": "Блокиран",

  // ---------------------------------------------------------------------------
  // Dashboard — elderly profiles
  // ---------------------------------------------------------------------------
  "Client dashboard": "Потребителски панел",
  "Create simple, non-medical profiles for elderly people you support. These records can now be selected in basic booking requests, while payment and helper assignment flows are not implemented yet.":
    "Създавайте прости немедицински профили за възрастните хора, на които помагате. Тези записи вече могат да се избират в основните заявки, докато плащането и възлагането на помощник все още не са реализирани.",
  "Sign up as client/caregiver": "Регистрирайте се",
  "Loading your profile and access role…": "Зареждане на профила и ролята ви…",
  "Profile setup error": "Грешка при настройката на профила",
  "Open dashboard profile setup": "Отворете настройката на профила",
  "Elderly profile management is for client/caregiver accounts. Your current role is":
    "Управлението на профили на близки е за обикновените потребителски профили. В момента вашата роля е",
  "Admin users may view this placeholder message only. Admin management for elderly profiles is not enabled here because this page only uses owner-scoped browser actions.":
    "Администраторите виждат само това съобщение. Управлението на профили на близки от администратор не е достъпно тук, защото страницата работи само с действия на собственика.",
  "Edit elderly profile": "Редактирайте профила на близък",
  "Create elderly profile": "Създайте профил на близък",
  "saved": "запазени",
  "Keep notes practical and non-medical, such as preferred visit times, hobbies, communication preferences, or general errands. Do not enter sensitive medical details, diagnoses, medication instructions, card PINs, passwords, cash-handling requests, or access-to-valuables requests.":
    "Опишете практични неща — удобни часове за посещение, любими занимания, начин на общуване или обичайни задачи. Не въвеждайте чувствителни медицински данни, диагнози, указания за лекарства, ПИН кодове, пароли, искания за боравене с пари или достъп до ценности.",
  "Update elderly profile": "Запазете промените",
  "Cancel editing": "Откажете редакцията",
  "Important boundaries": "Важни граници",
  "• Elderly profiles are for non-medical support planning only.":
    "• Профилите на близки служат само за планиране на немедицинска помощ.",
  "• Do not store diagnoses, medication instructions, passwords, PINs, or valuable-access instructions.":
    "• Не пазете диагнози, указания за лекарства, пароли, ПИН кодове или указания за достъп до ценности.",
  "Not implemented yet": "Все още не е реализирано",
  "• Basic client booking requests are available at /dashboard/bookings.":
    "• Основните заявки са достъпни на /dashboard/bookings.",
  "• Payment flow, Stripe, and live booking payments are not implemented.":
    "• Плащането, Stripe и реалните плащания по заявки не са реализирани.",
  "• There is no medical-service functionality.":
    "• Няма функционалност за медицински услуги.",
  "Saved elderly profiles": "Запазени профили на близки",
  "Only profiles owned by your signed-in account should appear here under current RLS policies.":
    "Според текущите RLS политики тук трябва да се показват само профилите на влезлия профил.",
  "Back to dashboard": "Обратно към профила",
  "No elderly profiles have been created yet.":
    "Все още няма създадени профили на близки.",
  "Non-medical notes": "Бележки",
  "No notes saved.": "Няма запазени бележки.",
  "Last updated": "Последна промяна",
  "Edit": "Редактирайте",
  "Deleting…": "Изтриване…",
  "Delete": "Изтрийте",
  ". These profiles are linked to your client/caregiver account.":
    ". Тези профили са свързани с вашия потребителски профил.",
  // elderly-profiles setMessage / status
  "Only client/caregiver accounts can save elderly profiles.":
    "Само обикновените потребителски профили могат да запазват профили на близки.",
  "Full name and city are required before saving an elderly profile.":
    "Името и градът са задължителни, преди да запазите профил на близък.",
  "Only client/caregiver accounts can delete elderly profiles.":
    "Само обикновените потребителски профили могат да изтриват профили на близки.",
  "Elderly profile deleted.": "Профилът на близкия е изтрит.",
  "Elderly profile updated.": "Профилът на близкия е обновен.",
  "Elderly profile created.": "Профилът на близкия е създаден.",
  "You need to log in as a client/caregiver before managing elderly profiles.":
    "Трябва да влезете в потребителски профил, преди да управлявате профили на близки.",
  "Your auth account is signed in, but the profiles table row is missing. Complete profile setup from the dashboard or confirm signup database records were created.":
    "Влезли сте в профила си, но липсва запис в таблицата с профили. Завършете настройката от профила си или проверете дали записите при регистрация са създадени.",

  // ---------------------------------------------------------------------------
  // Dashboard — bookings
  // ---------------------------------------------------------------------------
  "Create and manage basic non-medical service requests, including requests for a specific visible helper. Payment processing, helper acceptance, final confirmation, and matching are not active yet.":
    "Създавайте и управлявайте основни заявки за немедицинска помощ, включително към конкретен видим помощник. Обработката на плащания, потвърждението от помощник, окончателното потвърждение и автоматичното насочване все още не са активни.",
  "Create booking request": "Създайте заявка",
  ". New requests start with status Requested.":
    ". Новите заявки започват със статус „Заявена“.",
  "Admin users see this placeholder only. Full admin booking management is not enabled here because this route uses owner-scoped browser actions.":
    "Администраторите виждат само това съобщение. Пълното управление на заявки от администратор не е достъпно тук, защото страницата работи само с действия на собственика.",
  "Current limits": "Текущи ограничения",
  "• Requests are saved with status Requested.":
    "• Заявките се запазват със статус „Заявена“.",
  "• Specific-helper requests only store the helper profile ID; helper acceptance, matching, and notifications are not active.":
    "• Заявките към конкретен помощник запазват само номера на профила му; потвърждението, насочването и известията не са активни.",
  "• Payment processing and live booking payments are not active.":
    "• Обработката на плащания и реалните плащания по заявки не са активни.",
  "• Services remain non-medical only.":
    "• Услугите остават само немедицински.",
  "Safety boundaries": "Граници за безопасност",
  "• Do not include medical tasks or medication instructions.":
    "• Не включвайте медицински задачи или указания за лекарства.",
  "• Do not include PINs, passwords, or valuable-access instructions.":
    "• Не включвайте ПИН кодове, пароли или указания за достъп до ценности.",
  "Your booking requests": "Вашите заявки",
  "Only booking requests owned by your signed-in account should appear here under current RLS policies.":
    "Според текущите RLS политики тук трябва да се показват само заявките на влезлия профил.",
  "No booking requests have been created yet.":
    "Все още няма създадени заявки.",
  "Service category unavailable": "Категорията услуга е недостъпна",
  "For": "За",
  "elderly profile unavailable": "профилът на близкия е недостъпен",
  "Requested date/time": "Желана дата/час",
  "Duration": "Продължителност",
  "Not set": "Не е зададено",
  "Status": "Статус",
  "Helper request type": "Вид заявка към помощник",
  "Requested for a specific helper, but the helper is no longer publicly visible or the safe public helper details could not be read.":
    "Заявена е към конкретен помощник, но той вече не е публично видим или безопасните публични данни не можаха да се заредят.",
  "General/unassigned request. No specific helper profile is stored on this booking.":
    "Обща заявка без избран помощник. Към нея не е запазен конкретен профил на помощник.",
  "Cancel request": "Откажете заявката",
  "Cancelling…": "Отказване…",
  // bookings setMessage / status
  "Only client/caregiver accounts can create booking requests.":
    "Само обикновените потребителски профили могат да създават заявки.",
  "Create at least one elderly profile before making a booking request.":
    "Създайте поне един профил на близък, преди да направите заявка.",
  "Booking request created with status Requested. Payment and final confirmation are not active yet.":
    "Заявката е създадена със статус „Заявена“. Плащането и окончателното потвърждение все още не са активни.",
  "Only client/caregiver accounts can cancel their own requested booking requests.":
    "Само обикновените потребителски профили могат да отказват собствените си заявки със статус „Заявена“.",
  "Only booking requests with status Requested can be cancelled in this phase.":
    "На този етап могат да се отказват само заявки със статус „Заявена“.",
  "Booking request cancelled. It was not deleted.":
    "Заявката е отказана. Тя не е изтрита.",

  // ---------------------------------------------------------------------------
  // Dashboard — helper profile
  // ---------------------------------------------------------------------------
  "Dashboard": "Табло",
  "Helper profile management": "Управление на профила на помощник",
  "Approved helpers can edit safe public profile fields here. Helpers cannot change verification status, public visibility, account role, or admin-only fields.":
    "Одобрените помощници могат да редактират тук безопасните публични полета на профила. Не могат да променят статуса на проверка, публичната видимост, ролята на профила или служебните полета.",
  "Checking your session and helper profile…":
    "Проверка на профила ви като помощник…",
  "You need to log in before managing an approved helper profile.":
    "Трябва да влезете, преди да управлявате одобрен профил на помощник.",
  "Could not load profile": "Профилът не може да се зареди",
  "Application still in progress": "Кандидатурата все още се разглежда",
  "Helper profile management is available only after admin approval changes your role to verified helper. You can check or update your application while it remains editable.":
    "Управлението на профила на помощник е достъпно едва след като одобрение от нашия екип промени ролята ви на проверен помощник. Дотогава можете да преглеждате или обновявате кандидатурата си, докато подлежи на редакция.",
  "Open helper application": "Отворете кандидатурата за помощник",
  "Approved helpers only": "Само за одобрени помощници",
  "Helper profile management is only for approved helpers. Client/caregiver accounts can continue managing elderly profiles and booking requests from the dashboard.":
    "Управлението на профила на помощник е само за одобрени помощници. Обикновените потребителски профили могат да управляват профилите на близки и заявките от профила си.",
  "Admin visibility controls": "Управление на видимостта (за администратори)",
  "Admins manage public helper visibility from the admin dashboard. Helper self-editing is intended for verified helper accounts.":
    "Администраторите управляват публичната видимост на помощниците от административния панел. Самостоятелната редакция е предназначена за профилите на проверени помощници.",
  "Open admin dashboard": "Отворете административния панел",
  "Edit safe public fields": "Редактирайте публичните полета",
  "These fields may appear on `/helpers` only if an admin makes your approved helper profile visible. You cannot make yourself public from this form.":
    "Тези полета могат да се покажат на `/helpers` само ако администратор направи одобрения ви профил видим. От тази форма не можете да публикувате профила си сами.",
  "Verification status": "Статус на проверка",
  "Public visibility": "Публична видимост",
  "Visible on /helpers": "Видим на /helpers",
  "Hidden until an admin makes it visible":
    "Скрит, докато администратор не го направи видим",
  "Bio": "Описание",
  "Service radius in km": "Радиус на работа (в км)",
  "Describe your non-medical companionship, errands, technology help, or check-in support experience.":
    "Опишете опита си с компания, дребни задачи, помощ с техника или кратки посещения — без медицинска грижа.",
  "Optional": "По избор",
  "Saving…": "Запазване…",
  "Save helper profile": "Запазете профила",
  "Required safety guidance": "Задължителни правила за безопасност",
  "Services are non-medical everyday support only.":
    "Услугите са само немедицинска ежедневна помощ.",
  "No medication management, medication reminders with clinical judgment, injections, wound care, or clinical tasks.":
    "Без управление на лекарства, напомняния с медицинска преценка, инжекции, обработка на рани или медицински процедури.",
  "No cash handling, card PINs, passwords, or access-to-valuables requests.":
    "Без боравене с пари в брой, ПИН кодове на карти, пароли или достъп до ценности.",
  "Helpers are independent marketplace participants, not employees of Vnuk Pod Naem.":
    "Помощниците са самостоятелни участници в платформата, а не служители на Внук под наем.",
  "Public visibility is controlled by admins only; editing this form cannot publish your profile.":
    "Публичната видимост се контролира само от администраторите; редакцията на тази форма не публикува профила ви.",
  "Review prohibited services": "Вижте забранените услуги",
  // helper-profile setMessage / status
  "Please enter a bio of at least 20 characters.":
    "Моля, въведете описание от поне 20 знака.",
  "Please enter the city where you can provide non-medical support.":
    "Моля, посочете града, в който можете да предлагате немедицинска помощ.",
  "Service radius must be a whole number from 0 to 100 km, or left blank.":
    "Радиусът на работа трябва да е цяло число от 0 до 100 км или да остане празен.",
  "Only signed-in verified helpers can edit helper profile fields.":
    "Само влезли проверени помощници могат да редактират полетата на профила.",
  "Could not update helper profile for an unknown reason.":
    "Профилът на помощник не можа да се обнови по неизвестна причина.",
  "Helper profile saved. Public visibility is still controlled only by admins.":
    "Профилът е запазен. Публичната видимост все още се контролира само от администраторите.",
  "Your auth account is signed in, but the profiles table row is missing. Please complete or repair profile setup before managing a helper profile.":
    "Влезли сте в профила си, но липсва запис в таблицата с профили. Моля, завършете или поправете настройката, преди да управлявате профил на помощник.",
  "Your account is marked as a verified helper, but no helper_profiles row was found. Ask an admin to repair your approved helper profile.":
    "Профилът ви е отбелязан като проверен помощник, но не е намерен запис в helper_profiles. Помолете администратор да поправи одобрения ви профил.",

  // ---------------------------------------------------------------------------
  // Auth — elder signup / login / account (role system)
  // ---------------------------------------------------------------------------
  "Creating an account takes a minute. It lets you save the caregivers you like and continue your request when you are ready.":
    "Създаването на профил отнема минута. Така можете да запазите харесаните помощници и да продължите заявката си, когато сте готови.",
  "You will use your email to sign in.": "С този имейл ще влизате в профила си.",
  "Your phone number stays private. It is never shown to caregivers or other people — we use it only for your account.":
    "Вашият телефонен номер остава поверителен. Той никога не се показва на помощници или други хора — използваме го само за Вашия профил.",
  "Use at least 8 characters.": "Използвайте поне 8 знака.",
  "Profile photo": "Профилна снимка",
  "You can skip this and add a photo later.":
    "Можете да пропуснете това и да добавите снимка по-късно.",
  "Remove photo": "Премахнете снимката",
  "Please enter an age between 16 and 120.":
    "Моля, въведете възраст между 16 и 120.",
  "Please accept the Terms and Privacy Policy to create your account.":
    "Моля, приемете Условията и Политиката за поверителност, за да създадете профил.",
  "Your account was created. Please check your email to confirm it, then sign in. You can add a profile photo later from your profile.":
    "Профилът Ви е създаден. Моля, проверете имейла си, за да го потвърдите, след което влезте. Можете да добавите профилна снимка по-късно от профила си.",
  "Warm, private, simple": "Топло, поверително, лесно",
  "Your phone number is private and never shown to others.":
    "Телефонният Ви номер е поверителен и никога не се показва на други хора.",
  "No role to choose — everyone starts with one simple account.":
    "Няма роля за избиране — всеки започва с един прост профил.",
  "You can offer help as a caregiver later, from your profile.":
    "По-късно можете да предложите помощ като помощник — направо от профила си.",
  "Hide password": "Скрийте паролата",
  "Show password": "Покажете паролата",
  "Loading…": "Зареждане…",

  "Sign in with your email and password to continue where you left off.":
    "Влезте с имейл и парола, за да продължите оттам, докъдето сте стигнали.",
  "Create one": "Създайте профил",
  "You return exactly where you were, with your search kept.":
    "Връщате се точно там, където бяхте, със запазено търсене.",
  "Your profile is your simple account hub.":
    "Профилът Ви е лесното място за всичко около акаунта.",
  "Your phone number always stays private.":
    "Телефонният Ви номер винаги остава поверителен.",
  "That email or password did not match. Please check them and try again.":
    "Имейлът или паролата не съвпадат. Моля, проверете ги и опитайте отново.",
  "Please confirm your email first — check your inbox for the confirmation link.":
    "Първо потвърдете имейла си — проверете пощата си за връзката за потвърждение.",

  "View and update your details. Your phone number is private and only you can see it here.":
    "Вижте и обновете данните си. Телефонният Ви номер е поверителен и само Вие можете да го видите тук.",
  "Setup needed": "Необходима е настройка",
  "Sign in to view and edit your profile.":
    "Влезте, за да видите и редактирате профила си.",
  "Try again": "Опитайте отново",
  "Elder account": "Потребителски профил",
  "Caregiver": "Помощник",
  "Edit profile": "Редактирайте профила",
  "Your profile was saved.": "Профилът Ви е запазен.",
  "Phone — private to you": "Телефон — видим само за Вас",
  "Member since": "Регистриран от",
  "Not available": "Не е налично",
  "Your phone number stays private and is never shown to others.":
    "Телефонният Ви номер остава поверителен и никога не се показва на други хора.",
  "Optional — choose a new photo to replace the current one.":
    "По избор — изберете нова снимка, която да замени текущата.",
  "To change your sign-in email, please contact support for now.":
    "За да смените имейла за вход, засега се свържете с поддръжката.",
  "Please enter an age between 16 and 120, or leave it blank.":
    "Моля, въведете възраст между 16 и 120 или оставете полето празно.",
  "Save changes": "Запазете промените",
  "Cancel": "Отказ",
  "Things you can do": "Какво можете да правите",
  "Caregiver dashboard": "Табло за помощник",

  // ---------------------------------------------------------------------------
  // Caregiver dashboard — services & prices, schedule, regions
  // ---------------------------------------------------------------------------
  "Set up the services, prices, schedule, and regions that appear on your public profile and the marketplace. Each section saves on its own.":
    "Настройте услугите, цените, графика и районите, които се показват в публичния Ви профил и на пазара. Всеки раздел се запазва отделно.",
  "Checking your account…": "Проверяваме акаунта Ви…",
  "You need to sign in to reach the caregiver dashboard.":
    "Трябва да влезете, за да достигнете таблото за помощник.",
  "Approved caregivers only": "Само за одобрени помощници",
  "This dashboard is available once an admin approves your caregiver application. Standard accounts manage their details from My profile.":
    "Това табло е достъпно, след като администратор одобри Вашата кандидатура за помощник. Стандартните акаунти управляват данните си от „Моят профил“.",
  "Loading your caregiver profile…": "Зареждаме профила Ви на помощник…",
  "Could not load your caregiver profile":
    "Профилът Ви на помощник не можа да се зареди",
  "Caregiver profile missing": "Липсва профил на помощник",
  "Your account is approved as a caregiver, but no caregiver profile row was found. Please ask an admin to repair your approved caregiver profile.":
    "Акаунтът Ви е одобрен като помощник, но не е намерен профил на помощник. Моля, помолете администратор да възстанови одобрения Ви профил на помощник.",
  "Visible on the marketplace": "Видим на пазара",
  "Hidden until an admin makes you visible":
    "Скрит, докато администратор не Ви направи видим",
  "Services & prices": "Услуги и цени",
  "Schedule": "График",
  "Regions": "Райони",

  // Section 1 — services + prices + extras
  "Loading your services…": "Зареждаме услугите Ви…",
  "Could not load your services": "Услугите Ви не можаха да се заредят",
  "My services & prices": "Моите услуги и цени",
  "Turn on the services you perform and set your own price in лв. for each. These prices appear on your public profile and the marketplace.":
    "Включете услугите, които извършвате, и задайте собствена цена в лв. за всяка. Тези цени се показват в публичния Ви профил и на пазара.",
  "Offered": "Предлага се",
  "Offer this": "Предлагайте това",
  "Save services": "Запазете услугите",
  "Your services and prices were saved.": "Услугите и цените Ви бяха запазени.",
  "Optional extras": "Допълнителни услуги",
  "Small add-ons an elder can choose at booking time, each with its own price in лв. — for example taking out the trash or a light tidy-up.":
    "Малки добавки, които потребителят може да избере при заявка, всяка със собствена цена в лв. — например изхвърляне на боклука или лека подредба.",
  "No extras yet. Add one below if you offer small add-ons.":
    "Все още няма допълнителни услуги. Добавете отдолу, ако предлагате малки добавки.",
  "Remove": "Премахнете",
  "Add an extra": "Добавете услуга",
  "Your optional extras were saved.": "Допълнителните Ви услуги бяха запазени.",
  "Please give every extra a short name, or remove it.":
    "Моля, дайте кратко име на всяка добавка или я премахнете.",
  "Extra name (e.g. Take out the trash)":
    "Име на добавка (напр. Изхвърляне на боклука)",

  // Service catalogue names + descriptions
  "Non-medical social visits and conversation.":
    "Немедицински социални посещения и разговор.",
  "Simple local errands that do not involve medical, financial, or high-risk tasks.":
    "Прости местни задачи без медицински, финансови или високорискови дейности.",
  "Help with routine shopping for everyday items.":
    "Помощ с обичайно пазаруване на ежедневни стоки.",
  "Non-medical accompaniment for short local walks.":
    "Немедицинско придружаване за кратки разходки наблизо.",
  "Scheduled non-medical wellbeing check-ins and updates.":
    "Планирани немедицински проверки на благополучието и новини.",
  "Basic help using phones, computers, video calls, or online forms without handling passwords or sensitive financial access.":
    "Основна помощ с телефони, компютри, видеоразговори или онлайн формуляри, без работа с пароли или чувствителен финансов достъп.",
  "Non-medical accompaniment to appointments, shops, or community activities.":
    "Немедицинско придружаване до срещи, магазини или обществени дейности.",
  "Short visits": "Кратки посещения",
  "Brief non-medical wellbeing visits and company.":
    "Кратки немедицински посещения за благополучие и компания.",

  // Section 2 — schedule
  "My schedule": "Моят график",
  "Tap the 2-hour slots you are available, then save the week. Booked slots are locked and shown for reference.":
    "Докоснете 2-часовите интервали, в които сте свободни, след което запазете седмицата. Заетите интервали са заключени и се показват за справка.",
  "Previous week": "Предишна седмица",
  "Next week": "Следваща седмица",
  "This week": "Тази седмица",
  "Loading your week…": "Зареждаме седмицата Ви…",
  "Add": "Добавете",
  "Open": "Свободно",
  "Booked": "Заето",
  "Held": "Задържано",
  "Blocked": "Блокирано",
  "No changes to save for this week.":
    "Няма промени за запазване за тази седмица.",
  "Save this week": "Запазете тази седмица",
  "Recurring weekly pattern": "Повтарящ се седмичен модел",
  "Pick the slots you are usually free, then publish them across the coming weeks. This adds open slots and never overwrites booked ones.":
    "Изберете интервалите, в които обикновено сте свободни, и ги публикувайте за следващите седмици. Това добавя свободни интервали и никога не презаписва заетите.",
  "On": "Вкл.",
  "Off": "Изкл.",
  "Publish for the next": "Публикувайте за следващите",
  "weeks": "седмици",
  "Select at least one weekday and time slot first.":
    "Първо изберете поне един делничен ден и времеви интервал.",
  "This pattern produced no upcoming slots to publish.":
    "Този модел не създаде предстоящи интервали за публикуване.",
  "Publish weekly pattern": "Публикувайте седмичния модел",
  "Publishing…": "Публикуваме…",
  "Mon": "Пон",
  "Tue": "Вто",
  "Wed": "Сря",
  "Thu": "Чет",
  "Fri": "Пет",
  "Sat": "Съб",
  "Sun": "Нед",

  // Section 3 — regions
  "My operating regions": "Моите работни райони",
  "Choose the Sofia districts you serve, or turn on Whole city to cover all of them.":
    "Изберете районите на София, които обслужвате, или включете „Цял град“, за да покриете всички.",
  "Whole city": "Цял град",
  "Serve every Sofia district.": "Обслужвайте всеки район на София.",
  "Districts": "Райони",
  "Loading districts…": "Зареждаме районите…",
  "Your operating regions were saved.": "Работните Ви райони бяха запазени.",
  "Save regions": "Запазете районите",
  "Active — you cover every Sofia district.":
    "Активно — покривате всеки район на София.",
  "The dot shows roughly where each district sits in Sofia.":
    "Точката показва приблизително къде се намира всеки район в София.",
  "Could not update the whole-city setting":
    "Настройката „Цял град“ не можа да бъде обновена",
  "Could not save your districts": "Районите Ви не можаха да бъдат запазени",

  // Home search — Google Maps address autocomplete
  "Your address": "Вашият адрес",
  "Start typing your address in Sofia":
    "Започнете да въвеждате адреса си в София",
  "Suggestions are limited to addresses in Bulgaria.":
    "Предложенията са ограничени до адреси в България.",
  "Loading address search…": "Зареждаме търсенето по адрес…",
  "Address search is unavailable right now.":
    "Търсенето по адрес е недостъпно в момента.",
  "We currently serve Sofia — please enter a Sofia address":
    "В момента обслужваме София — моля, въведете адрес в София",
  "Address search is not configured yet. Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local for local development and to the Vercel environment variables for deployment.":
    "Търсенето по адрес все още не е настроено. Добавете NEXT_PUBLIC_GOOGLE_MAPS_API_KEY в .env.local за локална разработка и в средовите променливи на Vercel за внедряване.",
  "District": "Район",
  "Address": "Адрес",
  "Any Sofia district": "Всеки район на София",
  "Choose one or more services, your address, and a date range. We’ll show caregivers using the information that is currently available.":
    "Изберете една или повече услуги, своя адрес и период от дати. Ще покажем помощници според наличната в момента информация.",

  // Sofia district names (Cyrillic)
  "Sredets": "Средец",
  "Krasno selo": "Красно село",
  "Vazrazhdane": "Възраждане",
  "Oborishte": "Оборище",
  "Serdika": "Сердика",
  "Poduyane": "Подуяне",
  "Slatina": "Слатина",
  "Izgrev": "Изгрев",
  "Lozenets": "Лозенец",
  "Triaditsa": "Триадица",
  "Krasna polyana": "Красна поляна",
  "Ilinden": "Илинден",
  "Nadezhda": "Надежда",
  "Iskar": "Искър",
  "Mladost": "Младост",
  "Studentski": "Студентски",
  "Vitosha": "Витоша",
  "Ovcha kupel": "Овча купел",
  "Lyulin": "Люлин",
  "Vrabnitsa": "Връбница",
  "Novi Iskar": "Нови Искър",
  "Kremikovtsi": "Кремиковци",
  "Pancharevo": "Панчарево",
  "Bankya": "Банкя",

  // Dashboard hub — caregiver entry card
  "You are approved as a caregiver. Set up your services and prices, schedule, and operating regions. Admins still control public visibility.":
    "Одобрени сте като помощник. Настройте услугите и цените си, графика и работните райони. Администраторите все още контролират публичната видимост.",
  "Open caregiver dashboard": "Отворете таблото за помощник",
};
