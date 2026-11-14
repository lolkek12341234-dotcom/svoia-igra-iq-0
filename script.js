// =====================================================
// ПОДКЛЮЧЕНИЕ К ОБЛАЧНОЙ БАЗЕ (общие данные для всех игроков)
// =====================================================

const CLOUD_URL = "https://dparxledlopktcurmqkl.supabase.co";
// Публичный anon-ключ проекта — безопасен для встраивания в клиентский код,
// доступ к данным регулируется политиками RLS на стороне базы.
const CLOUD_KEY_PARTS = ["sb_publishable_qkl0Jg_U4H1_", "SRTueGivTg_gsXlp8GW"];
const CLOUD_KEY = CLOUD_KEY_PARTS.join("");

// Если библиотека не загрузилась — не роняем всю игру.
// Имя db — потому что глобальное имя supabase уже занято самой библиотекой.
let db = null;
if (window.supabase && window.supabase.createClient) {
    db = window.supabase.createClient(CLOUD_URL, CLOUD_KEY);
}

// Запрос в облако не должен висеть вечно
function withTimeout(promise, ms) {
    ms = ms || 12000;
    return Promise.race([
        promise,
        new Promise(function (resolve, reject) {
            setTimeout(function () { reject(new Error("timeout")); }, ms);
        })
    ]);
}

// =====================================================
// ИГРА 1: RESOLVER — вопросы
// =====================================================

const resolverQuestions = [
    // Panic
    {
category: "Panic",
question: "Как решается Localization?",
answer: ["Проехать на руках 30 сек.", "Выставить робота через Dynamic homing"],
options: ["Выставить робота через Dynamic homing", "Проехать на руках 30 сек.", "Перезагружу робота", "Сразу передам координатору"],
points: 100
},

{
category: "Panic",
question: "RoverChassis/Wheels: как решается данная ошибка?",
answer: ["Перезагружу робота, если он не 600+", "Сбросить напряжение с шасси, используя Reset current limiter"],
options: ["Перезагружу робота, если он не 600+", "Закрыть крышку через кнопку Close", "Проехать на руках 20–30 сек.", "Сбросить напряжение с шасси, используя Reset current limiter"],
points: 200
},

{
category: "Panic",
question: "/Perception/RiderDetection/Rider: RiderCrit — как решить данную ошибку?",
answer: ["Нажимаем Parking", "Включаем звуковой сигнал Alarm short"],
options: ["Уведомить старшего оператора", "Включаем звуковой сигнал Alarm short", "Перезапускаем робота", "Нажимаем Parking"],
points: 300
},

{
category: "Panic",
question: "/Sensors/Lidars: как решить данную ошибку?",
answer: "Пробуем прокатить робота 20–30 секунд; если не помогает — передаём координатору",
options: ["Пробуем прокатить робота 20–30 секунд; если не помогает — передаём координатору", "Перезагружу робота", "Оставлю робота и закрою реквест как False", "Нужно локализовать робота"],
points: 400
},

{
category: "Panic",
question: "/Endpoints/…: как решить данную ошибку?",
answer: ["Проехать 20–30 сек.", "Передам координатору"],
options: ["Проехать 20–30 сек.", "Передам координатору", "Перезапущу робота", "Проставлю точку через Navigate to"],
points: 500
},

    // Stuck
    {
    category: "Stuck",
    question: "Перед роботом толпа людей, из-за которой он не может проехать. Что делать?",
    answer: "Прожму Give a way",
    options: ["Поставлю полигон Blockage", "Прожму Alarm short", "Прожму Give a way", "Давить"],
    points: 100
},
{
    category: "Stuck",
    question: "Робот не может проехать из-за нависающих веток. Что делать?",
    answer: "Отключу парктроники и аккуратно проеду ветки",
    options: ["Поставлю полигон Blockage", "Развернусь и проеду задом", "Передам координатору", "Отключу парктроники и аккуратно проеду ветки"],
    points: 200
},
{
    category: "Stuck",
    question: "Робот не может заехать на тротуар, так как там припаркован автомобиль. Что делать?",
    answer: "Поставлю полигон Blockage",
    options: ["Поставлю полигон Blockage", "Передам реквест координаторам", "Попытаюсь объехать автомобиль", "Поставлю полигон Static"],
    points: 300
},
{
    category: "Stuck",
    question: "Робот не может проехать из-за недавно установленного столба. Что делать?",
    answer: ["Нанести полигон Static на столб", "Объехать в режиме RCMD"],
    options: ["Нанести полигон Static на столб", "Это ложный реквест: False", "Объехать в режиме RCMD", "Поставлю полигон Blockage"],
    points: 400
},
{
    category: "Stuck",
    question: "Робот на парковке ПВЗ «Точка А». Статус заказа — Returning to. Что делать?",
    answer: "Нажму Finish route",
    options: ["Откачу робота, чтобы он поехал к клиенту", "Это ложный реквест: False", "Передам координатору", "Нажму Finish route"],
    points: 500
},

    // Incident detected
    {
        category: "Incident detected",
        question: "Нужно ли менять статус смены, когда решаешь Incident detected?",
        answer: "ДА",
        options: ["ДА", "НЕТ"],
        points: 100
    },
    {
        category: "Incident detected",
        question: "В робота специально въехал велосипедист. Какой тип инцидента?",
        answer: "Акт насилия над роботом",
        options: ["Проблема с роботом", "Акт насилия над роботом", "Столкновение", "Нарушение ПДД/ЭПР"],
        points: 200
    },
    {
        category: "Incident detected",
        question: "На робота наклеили наклейку. Какой тип инцидента?",
        answer: "Акт насилия над роботом",
        options: ["Нарушение ПДД", "Столкновение", "Проблема с роботом", "Акт насилия над роботом"],
        points: 300
    },
    {
        category: "Incident detected",
        question: "Робот врезался в экскаватор. Какой тип инцидента?",
        answer: "ДТП",
        options: ["ДТП", "Нарушение ПДД/ЭПР", "Проблема с роботом", "Столкновение"],
        points: 400
    },
    {
        category: "Incident detected",
        question: "Робот в режиме «Авто» скатился с тротуара, врезался в стену и разбил камеру. Какой тип инцидента?",
        answer: "Нарушение ПДД/ЭПР",
        options: ["ДТП", "Проблема с роботом", "Столкновение", "Нарушение ПДД/ЭПР"],
        points: 500
    },

    // Передача координатору
{
    category: "Передача координатору",
    question: "Какие условия нужно соблюсти при передаче робота координаторам?",
    answer: ["Передавать в режиме RCMD", "В безопасном месте", "Не мешая проходу/проезду", "С верной резолюцией и комментарием"],
    options: ["Передавать в режиме RCMD", "В безопасном месте", "Не мешая проходу/проезду", "С верной резолюцией и комментарием"],
    points: 100
},
 {
    category: "Передача координатору",
    question: "Выбери, когда нужно передавать робота координатору.",
    answer: ["Не распознаёт кроп светофора", "У робота сломан флажок"],
    options: ["Не распознаёт кроп светофора", "Робот подпрыгнул на тротуаре, и сработал Incident detected", "У робота сломан флажок", "Робот не может объехать припаркованный автомобиль", "Робот едет не в ту сторону"],
    points: 200
},
{
    category: "Передача координатору",
    question: "Робот стоит возле парковки, но на ней нет места. С какой резолюцией передать робота координаторам?",
    answer: "Road blocked",
    options: [ "Incident", "Other","Road blocked", "Didn't put"],
    points: 300
},
{
    category: "Передача координатору",
    question: "Что делать, если пришёл реквест от координатора?",
    answer: ["Обработать реквест", "Передать обратно координаторам"],
    options: ["Обработать реквест", "Передать обратно координаторам", "Обработать реквест и закрыть", "Это ошибочный реквест: закрыть как False"],
    points: 400
},
{
    category: "Передача координатору",
    question: "Что делать, если робота перехватил координатор?",
    answer: "Закрыть реквест как False",
    options: ["Нажимаем Parking", "Написать координаторам, узнать, что происходит", "Забрать обратно, ведь это наш реквест", "Закрыть реквест как False"],
    points: 500
},

    // Светофор
{
    category: "Светофор",
    question: "ПП разделен островком безопасности, длиной больше 5м. Наши действия?",
    answer: "Проехать за два раза остановившись на остравке",
    options: ["Проехать за два раза остановившись на остравке", "проехать за один раз, время позволяет", "Поставить полигон Blockage", "Проехать строго в режиме RCMD"],
    points: 100
},
{
    category: "Светофор",
    question: "На пп авария, не проехать. Наши действия?",
    answer: "Поставить полигон Blockage",
    options: ["Поставить полигон Static на место ДТП", "Поехать когда пойдут люди", "Передать реквест коорду", "Поставить полигон Blockage"],
    points: 200
},
{
    category: "Светофор",
    question: "Что делать если Не работает не один светофор на перекрестке?",
    answer: "Поставить полигон Blockage",
    options: ["Проехать через ПП", "Поставить полигон Blockage", "Отдать реквест коордам", "Ждать пока не включится"],
    points: 300
},
{
    category: "Светофор",
    question: "Что делать, если робот не распознаёт кроп светофора?",
    answer: "Передать координатору",
    options: ["Передать координатору", "Перезагрузить робота", "Поставить полигон Blockage", "Нажать Alarm short"],
    points: 400
},
{
    category: "Светофор",
    question: "На ПП стоит регулировщик наши действия?",
    answer: "Поставить полигон Blockage",
    options: ["Проехать ПП", "Передать реквест коорду", "Поставить полигон Blockage", "Ждать пока палка не посмотрит в лево и ехать как королева"],
    points: 500
},
];


// =====================================================
// ИГРА 2: OUTSOURCE-RESOLVER — вопросы
// ЗАПОЛНИ СВОИМИ ВОПРОСАМИ! (5 категорий × 5 вопросов)
// =====================================================

const outsourceQuestions = [


// Категория 1 — Реквесты
{ category: "Реквесты",
  question: "Что делать если нет места на парковке?",
  answer: "Припарковать робота рядом с ней",
  options: ["Передать Coordinator", "Припарковать робота рядом с ней", "Прожать кнопку Park", "Закрыть реквест как False"],
  points: 100
},

{ category: "Реквесты",
  question: "Что делать если крит ошибка то появляется, то сама исчезает?",
  answer: "Передать Coordinator",
  options: ["Перезагрузить робота", "Проехатся 30 сек", "Передать Coordinator", "Передать реквест Resolver"],
  points: 200
},

{ category: "Реквесты",
  question: "Робот застакался перед столбом, отмеченным на карте красным цветом, что делать?",
  answer: "Объехать в ручном режиме",
  options: ["Удалить полигон в карте", "Объехать в ручном режиме", "Закрыть реквест как False", "Передать реквест Resolver"],
  points: 300
},

{ category: "Реквесты",
  question: "Какие криты могут решить младшие операторы?",
  answer: ["Крит по траектории", "Крит по детям"],
  options: ["Крит по детям", "Крит по  локализации", "Крит по Endpoints", "Крит по траектории"],
  points: 400
},

{ category: "Реквесты",
  question: "При каких характеристиках робота можно закрыть реквест?",
  answer: ["AUTO", "зеленый ICP", "Отсутствие критов"],
  options: ["AUTO", "зеленый ICP", "У робота есть критическая ошибка", "Робот в режиме RCMD", "Неправильный 2", "Отсутствие критов"],
  points: 500
},

// Категория 2 — Передача реквеста
{ category: "Передача реквеста",
  question: "Если с роботом потеряна связь более 30 сек, какие наши действия?",
  answer: "Передать Coordinator",
  options: ["Перезагрузить робота", "Передать Coordinator", "Проехатся 30 сек", "Передать реквест Resolver"],
  points: 100
},

{ category: "Передача реквеста",
  question: "Какую резолюцию выбрать при передаче реквеста Coordinator, если у робота сломан флажок?",
  answer: "Mechanical",
  options: ["Didn't put", "Road blocked", "Mechanical", "Incident"],
  points: 200
},

{ category: "Передача реквеста",
  question: "Какие типы стака мы передаем оператору?",
  answer: "Stuck Traffic Lights",
  options: ["Stuck Traffic Lights", "Stuck Common", "Stuck don’t know where", "Stuck For a long time"],
  points: 300
},

{ category: "Передача реквеста",
  question: "Что делать, если робота дергают за флажок?",
  answer: "Передать реквест Resolver",
  options: ["Передать Coordinator", "Заполнить Incident", "Передать реквест Resolver", "Пытатся уехать"],
  points: 400
},

{ category: "Передача реквеста",
  question: "Что делать, если робот стоит на островке безопасности между светло-зелеными пешеходными переходами?",
  answer: "Передать Resolver",
  options: ["Отправить быстрый комментарий в map", "Проехать пешиходный переход", "Передать Coordinator", "Передать Resolver"],
  points: 500
},

// Категория 3 — Случайная категория
{ category: "Случайная категория",
  question: "Пропустил реквест и смена ушла в паузу, что делать?",
  answer: "Сообщить старшему, открыть смену",
  options: ["Закрыть смену ", "Сообщить старшему,", "открыть смену", "Встать в Busy", "Ждать с моря погоды"],
  points: 100
},

{ category: "Случайная категория",
  question: "Если твоего робота перехватил Watcher во время решения реквеста. Что делать?",
  answer: "Закрыть реквест как False",
  options: ["Закрыть реквест как False", "Забрать обратно", "Передать Resolver", "Закрыть реквест как Done"],
  points: 200
},

{ category: "Случайная категория",
  question: "Камеры робота в грязи и ничего не видно, что делать?",
  answer: "Передать Coordinator",
  options: ["Заполнить Incident", "Встать против ветра", "Передать Coordinator", "Передать Resolver"],
  points: 300
},

{ category: "Случайная категория",
  question: "Отметь признаки инцидента",
  answer: ["Робот причинил вред кому-то", "Робот причинил вред чему-то", "Роботу причинён вред", "Нарушение ПДД"],
  options: ["Роботу причинён вред", "Ничего не произашло", "Робот причинил вред кому-то", "Робот причинил вред чему-то", "Робота погладили", "Нарушение ПДД"],
  points: 400
},

{ category: "Случайная категория",
  question: "Пришел стак, а робот уже едет на ПП?",
  answer: "Проследить за роботом, в случае необходимости — оказать помощь. Закрыть реквест, когда робот будет ехать в авто в безопасной зоне",
  options: ["Заполнить Incident", "Проследить за роботом", "в случае необходимости — оказать помощь", "Закрыть реквест, когда робот будет ехать в авто в безопасной зоне", "Закрыть реквест как False", "Передать Resolver"],
  points: 500
},

// Категория 4 — RC
{ category: "RC",
  question: "Какой статус заказа, если робот едет к клиенту?",
  answer: "Heading to",
  options: ["Accepted order", "Arrived to client", "Heading to", "Returning to"],
  points: 100
},

{ category: "RC",
  question: "Какая кнопка включает/отключает отображение на карте всех роботов?",
  answer: "Rovers",
  options: ["Rovers", "Lanes", " Robot routes", "Layers"],
  points: 200
},

{ category: "RC",
  question: "Каким цветом в карте указана велодорожка?",
  answer: "Голубой",
  options: ["Желтый", "Голубой", "Крастный", "Зеленый"],
  points: 300
},

{ category: "RC",
  question: "Можно ли ездить по черным линиям?",
  answer: "Нет",
  options: ["Незнаю", "Наверное", "Нет", "Да"],
  points: 400
},

{ category: "RC",
  question: "Какая кнопка помечает реквест, как ошибочно сформированный?",
  answer: "False",
  options: ["More", "False", "Lanes", "Три точки"],
  points: 500
},

// Категория 5 — Инциденты
{ category: "Инциденты",
  question: "О робота ударился ребенок",
  answer: "Столкновение",
  options: ["Столкновение", "Нарушение ПДД ЭПР", "Акт насилия", "ДТП"],
  points: 100
},

{ category: "Инциденты",
  question: "Робот мешал транспортным средствам на ПП",
  answer: "Нарушение ПДД ЭПР",
  options: ["Акт насилия", "Столкновение", "Нарушение ПДД ЭПР", "Инцидента нет"],
  points: 200
},

{ category: "Инциденты",
  question: "На робота поставили пакеты и убрали",
  answer: "Инцидента нет",
  options: ["Акт насилия", "Инцидента нет", "Столкновение", "Нарушение ПДД ЭПР"],
  points: 300
},

{ category: "Инциденты",
  question: "Робот пересек высокий бордюр, но не упал",
  answer: "Нарушение ПДД ЭПР",
  options: ["Техническая неисправность", "Инцидента нет", "Столкновение", "Нарушение ПДД ЭПР"],
  points: 400
},

{ category: "Инциденты",
  question: "На верхнюю крышку робота приклеили листок",
  answer: "Акт насилия",
  options: ["Инцидента нет", "Акт насилия", "Нарушение ПДД ЭПР", "Столкновение"],
  points: 500
},

    
];

// =====================================================
// ИГРА 3: COORDINATOR — вопросы
// ЗАПОЛНИ СВОИМИ ВОПРОСАМИ! (5 категорий × 5 вопросов)
// =====================================================

const coordinatorQuestions = [


    // Категория 1
    { category: "Категория 1",
     question: "Вопрос 1 (замени меня)", 
     answer: "Правильный ответ", 
     options: ["Правильный ответ", "Неправильный 1", "Неправильный 2", "Неправильный 3"], 
     points: 100 
    },

    { category: "Категория 1",
     question: "Вопрос 1 (замени меня)", 
     answer: "Правильный ответ", 
     options: ["Правильный ответ", "Неправильный 1", "Неправильный 2", "Неправильный 3"], 
     points: 200 
    },

     { category: "Категория 1",
     question: "Вопрос 1 (замени меня)", 
     answer: "Правильный ответ", 
     options: ["Правильный ответ", "Неправильный 1", "Неправильный 2", "Неправильный 3"], 
     points: 300 
    },

     { category: "Категория 1",
     question: "Вопрос 1 (замени меня)", 
     answer: "Правильный ответ", 
     options: ["Правильный ответ", "Неправильный 1", "Неправильный 2", "Неправильный 3"], 
     points: 400 
    },

     { category: "Категория 1",
     question: "Вопрос 1 (замени меня)", 
     answer: "Правильный ответ", 
     options: ["Правильный ответ", "Неправильный 1", "Неправильный 2", "Неправильный 3"], 
     points: 500 
    },


    // Категория 2
    { category: "Категория 2", 
    question: "Вопрос 1 (замени меня)", 
    answer: "Правильный ответ", 
    options: ["Правильный ответ", "Неправильный 1", "Неправильный 2", "Неправильный 3"], 
    points: 100 
    },

        { category: "Категория 2", 
    question: "Вопрос 1 (замени меня)", 
    answer: "Правильный ответ", 
    options: ["Правильный ответ", "Неправильный 1", "Неправильный 2", "Неправильный 3"], 
    points: 200 
    },

        { category: "Категория 2", 
    question: "Вопрос 1 (замени меня)", 
    answer: "Правильный ответ", 
    options: ["Правильный ответ", "Неправильный 1", "Неправильный 2", "Неправильный 3"], 
    points: 300 
    },

        { category: "Категория 2", 
    question: "Вопрос 1 (замени меня)", 
    answer: "Правильный ответ", 
    options: ["Правильный ответ", "Неправильный 1", "Неправильный 2", "Неправильный 3"], 
    points: 400 
    },

        { category: "Категория 2", 
    question: "Вопрос 1 (замени меня)", 
    answer: "Правильный ответ", 
    options: ["Правильный ответ", "Неправильный 1", "Неправильный 2", "Неправильный 3"], 
    points: 500 
    },
   
    // Категория 3

    { category: "Категория 3", 
    question: "Вопрос 1 (замени меня)", 
    answer: "Правильный ответ", 
    options: ["Правильный ответ", "Неправильный 1", "Неправильный 2", "Неправильный 3"], 
    points: 100 
    },
    
        { category: "Категория 3", 
    question: "Вопрос 1 (замени меня)", 
    answer: "Правильный ответ", 
    options: ["Правильный ответ", "Неправильный 1", "Неправильный 2", "Неправильный 3"], 
    points: 200 
    },

        { category: "Категория 3", 
    question: "Вопрос 1 (замени меня)", 
    answer: "Правильный ответ", 
    options: ["Правильный ответ", "Неправильный 1", "Неправильный 2", "Неправильный 3"], 
    points: 300 
    },

        { category: "Категория 3", 
    question: "Вопрос 1 (замени меня)", 
    answer: "Правильный ответ", 
    options: ["Правильный ответ", "Неправильный 1", "Неправильный 2", "Неправильный 3"], 
    points: 400 
    },

        { category: "Категория 3", 
    question: "Вопрос 1 (замени меня)", 
    answer: "Правильный ответ", 
    options: ["Правильный ответ", "Неправильный 1", "Неправильный 2", "Неправильный 3"], 
    points: 500 
    },

    // Категория 4

    { category: "Категория 4", 
    question: "Вопрос 1 (замени меня)", 
    answer: "Правильный ответ", 
    options: ["Правильный ответ", "Неправильный 1", "Неправильный 2", "Неправильный 3"], 
    points: 100 
    },

        { category: "Категория 4", 
    question: "Вопрос 1 (замени меня)", 
    answer: "Правильный ответ", 
    options: ["Правильный ответ", "Неправильный 1", "Неправильный 2", "Неправильный 3"], 
    points: 200 
    },

        { category: "Категория 4", 
    question: "Вопрос 1 (замени меня)", 
    answer: "Правильный ответ", 
    options: ["Правильный ответ", "Неправильный 1", "Неправильный 2", "Неправильный 3"], 
    points: 300 
    },

        { category: "Категория 4", 
    question: "Вопрос 1 (замени меня)", 
    answer: "Правильный ответ", 
    options: ["Правильный ответ", "Неправильный 1", "Неправильный 2", "Неправильный 3"], 
    points: 400 
    },

        { category: "Категория 4", 
    question: "Вопрос 1 (замени меня)", 
    answer: "Правильный ответ", 
    options: ["Правильный ответ", "Неправильный 1", "Неправильный 2", "Неправильный 3"], 
    points: 500 
    },




    // Категория 5

    { category: "Категория 5", 
    question: "Вопрос 1 (замени меня)", 
    answer: "Правильный ответ", 
    options: ["Правильный ответ", "Неправильный 1", "Неправильный 2", "Неправильный 3"], 
    points: 100 
    },

    { category: "Категория 5", 
    question: "Вопрос 1 (замени меня)", 
    answer: "Правильный ответ", 
    options: ["Правильный ответ", "Неправильный 1", "Неправильный 2", "Неправильный 3"], 
    points: 200 
    },

    { category: "Категория 5", 
    question: "Вопрос 1 (замени меня)", 
    answer: "Правильный ответ", 
    options: ["Правильный ответ", "Неправильный 1", "Неправильный 2", "Неправильный 3"], 
    points: 300 
    },

    { category: "Категория 5", 
    question: "Вопрос 1 (замени меня)", 
    answer: "Правильный ответ", 
    options: ["Правильный ответ", "Неправильный 1", "Неправильный 2", "Неправильный 3"], 
    points: 400 
    },

    { category: "Категория 5", 
    question: "Вопрос 1 (замени меня)", 
    answer: "Правильный ответ", 
    options: ["Правильный ответ", "Неправильный 1", "Неправильный 2", "Неправильный 3"], 
    points: 500 
    },
    
];

    // =====================================================
// ИГРА 4: WATCHER — вопросы
// ЗАПОЛНИ СВОИМИ ВОПРОСАМИ! (5 категорий × 5 вопросов)
// =====================================================

const watcherQuestions = [



    // Категория 1
    { category: "Категория 1",
     question: "Вопрос 1 (замени меня)", 
     answer: "Правильный ответ", 
     options: ["Правильный ответ", "Неправильный 1", "Неправильный 2", "Неправильный 3"], 
     points: 100 
    },

    { category: "Категория 1",
     question: "Вопрос 1 (замени меня)", 
     answer: "Правильный ответ", 
     options: ["Правильный ответ", "Неправильный 1", "Неправильный 2", "Неправильный 3"], 
     points: 200 
    },

     { category: "Категория 1",
     question: "Вопрос 1 (замени меня)", 
     answer: "Правильный ответ", 
     options: ["Правильный ответ", "Неправильный 1", "Неправильный 2", "Неправильный 3"], 
     points: 300 
    },

     { category: "Категория 1",
     question: "Вопрос 1 (замени меня)", 
     answer: "Правильный ответ", 
     options: ["Правильный ответ", "Неправильный 1", "Неправильный 2", "Неправильный 3"], 
     points: 400 
    },

     { category: "Категория 1",
     question: "Вопрос 1 (замени меня)", 
     answer: "Правильный ответ", 
     options: ["Правильный ответ", "Неправильный 1", "Неправильный 2", "Неправильный 3"], 
     points: 500 
    },


    // Категория 2
    { category: "Категория 2", 
    question: "Вопрос 1 (замени меня)", 
    answer: "Правильный ответ", 
    options: ["Правильный ответ", "Неправильный 1", "Неправильный 2", "Неправильный 3"], 
    points: 100 
    },

        { category: "Категория 2", 
    question: "Вопрос 1 (замени меня)", 
    answer: "Правильный ответ", 
    options: ["Правильный ответ", "Неправильный 1", "Неправильный 2", "Неправильный 3"], 
    points: 200 
    },

        { category: "Категория 2", 
    question: "Вопрос 1 (замени меня)", 
    answer: "Правильный ответ", 
    options: ["Правильный ответ", "Неправильный 1", "Неправильный 2", "Неправильный 3"], 
    points: 300 
    },

        { category: "Категория 2", 
    question: "Вопрос 1 (замени меня)", 
    answer: "Правильный ответ", 
    options: ["Правильный ответ", "Неправильный 1", "Неправильный 2", "Неправильный 3"], 
    points: 400 
    },

        { category: "Категория 2", 
    question: "Вопрос 1 (замени меня)", 
    answer: "Правильный ответ", 
    options: ["Правильный ответ", "Неправильный 1", "Неправильный 2", "Неправильный 3"], 
    points: 500 
    },
   
    // Категория 3

    { category: "Категория 3", 
    question: "Вопрос 1 (замени меня)", 
    answer: "Правильный ответ", 
    options: ["Правильный ответ", "Неправильный 1", "Неправильный 2", "Неправильный 3"], 
    points: 100 
    },
    
        { category: "Категория 3", 
    question: "Вопрос 1 (замени меня)", 
    answer: "Правильный ответ", 
    options: ["Правильный ответ", "Неправильный 1", "Неправильный 2", "Неправильный 3"], 
    points: 200 
    },

        { category: "Категория 3", 
    question: "Вопрос 1 (замени меня)", 
    answer: "Правильный ответ", 
    options: ["Правильный ответ", "Неправильный 1", "Неправильный 2", "Неправильный 3"], 
    points: 300 
    },

        { category: "Категория 3", 
    question: "Вопрос 1 (замени меня)", 
    answer: "Правильный ответ", 
    options: ["Правильный ответ", "Неправильный 1", "Неправильный 2", "Неправильный 3"], 
    points: 400 
    },

        { category: "Категория 3", 
    question: "Вопрос 1 (замени меня)", 
    answer: "Правильный ответ", 
    options: ["Правильный ответ", "Неправильный 1", "Неправильный 2", "Неправильный 3"], 
    points: 500 
    },

    // Категория 4

    { category: "Категория 4", 
    question: "Вопрос 1 (замени меня)", 
    answer: "Правильный ответ", 
    options: ["Правильный ответ", "Неправильный 1", "Неправильный 2", "Неправильный 3"], 
    points: 100 
    },

        { category: "Категория 4", 
    question: "Вопрос 1 (замени меня)", 
    answer: "Правильный ответ", 
    options: ["Правильный ответ", "Неправильный 1", "Неправильный 2", "Неправильный 3"], 
    points: 200 
    },

        { category: "Категория 4", 
    question: "Вопрос 1 (замени меня)", 
    answer: "Правильный ответ", 
    options: ["Правильный ответ", "Неправильный 1", "Неправильный 2", "Неправильный 3"], 
    points: 300 
    },

        { category: "Категория 4", 
    question: "Вопрос 1 (замени меня)", 
    answer: "Правильный ответ", 
    options: ["Правильный ответ", "Неправильный 1", "Неправильный 2", "Неправильный 3"], 
    points: 400 
    },

        { category: "Категория 4", 
    question: "Вопрос 1 (замени меня)", 
    answer: "Правильный ответ", 
    options: ["Правильный ответ", "Неправильный 1", "Неправильный 2", "Неправильный 3"], 
    points: 500 
    },




    // Категория 5

    { category: "Категория 5", 
    question: "Вопрос 1 (замени меня)", 
    answer: "Правильный ответ", 
    options: ["Правильный ответ", "Неправильный 1", "Неправильный 2", "Неправильный 3"], 
    points: 100 
    },

    { category: "Категория 5", 
    question: "Вопрос 1 (замени меня)", 
    answer: "Правильный ответ", 
    options: ["Правильный ответ", "Неправильный 1", "Неправильный 2", "Неправильный 3"], 
    points: 200 
    },

    { category: "Категория 5", 
    question: "Вопрос 1 (замени меня)", 
    answer: "Правильный ответ", 
    options: ["Правильный ответ", "Неправильный 1", "Неправильный 2", "Неправильный 3"], 
    points: 300 
    },

    { category: "Категория 5", 
    question: "Вопрос 1 (замени меня)", 
    answer: "Правильный ответ", 
    options: ["Правильный ответ", "Неправильный 1", "Неправильный 2", "Неправильный 3"], 
    points: 400 
    },

    { category: "Категория 5", 
    question: "Вопрос 1 (замени меня)", 
    answer: "Правильный ответ", 
    options: ["Правильный ответ", "Неправильный 1", "Неправильный 2", "Неправильный 3"], 
    points: 500 
    },

    
];


// =====================================================
// НАБОРЫ ИГР
// =====================================================

const GAME_SETS = {
    resolver: {
        title: "Resolver",
        questions: resolverQuestions
    },
    outsource: {
        title: "Outsource-Resolver",
        questions: outsourceQuestions
    },
    coordinator: {
        title: "Coordinator",
        questions: coordinatorQuestions
    },
    watcher: {
        title: "Watcher",
        questions: watcherQuestions
    }
};


// Текущая выбранная игра
let currentGameMode = null;

// Активные вопросы текущей игры (слот-модель: категория × стоимость)
let questions = [];

// Архив вопросов (не на поле, но сохранены)
let archiveData = [];

// Все категории режима (активные и неактивные)
let allCategories = [];

// Топ игроков
let leaderboardData = [];

// Счётчик сыгранных игр
let gamesCountData = 0;


// =====================================================
// СОСТОЯНИЕ ИГРЫ
// =====================================================

let currentPlayer = 1;
let players = [];
let currentQuestion = null;
let questionAnswered = false;
let foundAnswers = [];
let timerInterval = null;
let timeoutInterval = null;

// Коэффициенты снижения стоимости вопроса за каждую ошибку.
const ANSWER_VALUE_MULTIPLIERS = [1, 0.6, 0.4, 0.25, 0.15];
let currentQuestionWrongAttempts = 0;
let gameStartTime = Date.now();
let gameCounted = false;

// Ключи хранилища — зависят от выбранной игры (только для локального состояния партии)
let STORAGE_KEY = null;

function setGameMode(mode) {
    currentGameMode = mode;
    const set = GAME_SETS[mode];
    STORAGE_KEY = "svoya-igra-state-" + mode;

    // Обновляем заголовок на стартовом экране
    const setupTitle = document.getElementById("setup-title");
    if (setupTitle) {
        setupTitle.textContent = "Настройка игры: " + set.title;
    }
}

// =====================================================
// ЗАГРУЗКА ДАННЫХ ИЗ ОБЛАКА
// =====================================================

let isSeeding = false; // флаг: сейчас заливаем стартовые вопросы в базу

async function loadGameData(mode) {
    if (!db) {
        console.error("Облачная библиотека не загрузилась (заблокирован CDN?)");
        return false;
    }
    try {
        // --- Категории ---
        let catsRes = await withTimeout(
            db.from("categories").select("*").eq("mode", mode).order("id")
        );
        if (catsRes.error) throw catsRes.error;
        allCategories = catsRes.data || [];

        // --- Вопросы ---
        let qRes = await withTimeout(
            db.from("questions").select("*").eq("mode", mode).order("id")
        );
        if (qRes.error) throw qRes.error;
        let questionsData = qRes.data || [];

        // --- Если вопросов нет — заливаем стартовые из кода ---
        // (категории заливаем, только если их тоже ещё нет)
        if (questionsData.length === 0) {
            isSeeding = true;
            await seedInitialData(mode, allCategories.length === 0);
            // Перечитываем после сидирования
            catsRes = await withTimeout(
                db.from("categories").select("*").eq("mode", mode).order("id")
            );
            allCategories = catsRes.data || [];
            qRes = await withTimeout(
                db.from("questions").select("*").eq("mode", mode).order("id")
            );
            questionsData = qRes.data || [];
            isSeeding = false;
        }

        // --- Вопросы → слот-модель (категория × стоимость) ---
        const active = allCategories
            .filter(function (c) { return c.active; })
            .map(function (c) { return c.name; });
        const total = active.length * 5;
        questions = new Array(total).fill(null);

        questionsData.forEach(function (q) {
            if (q.archived) return; // архивные не на поле
            const catIdx = active.indexOf(q.category);
            if (catIdx === -1) return;
            const row = q.points / 100 - 1;
            if (row < 0 || row > 4) return;
            questions[catIdx * 5 + row] = {
                id: q.id,
                category: q.category,
                question: q.question,
                answer: q.answer,
                options: q.options,
                points: q.points
            };
        });

        // --- Архив ---
        archiveData = questionsData
            .filter(function (q) { return q.archived; })
            .map(function (q) {
                return {
                    id: q.id,
                    category: q.category,
                    question: q.question,
                    answer: q.answer,
                    options: q.options,
                    points: q.points
                };
            });

        // --- Топ игроков ---
        const lbRes = await withTimeout(
            db.from("leaderboard")
                .select("*")
                .eq("mode", mode)
                .order("score", { ascending: false })
                .limit(20)
        );
        leaderboardData = lbRes.data || [];

        // --- Счётчик игр ---
        const gcRes = await withTimeout(
            db.from("games_count").select("*").eq("mode", mode).maybeSingle()
        );
        gamesCountData = gcRes.data ? gcRes.data.count : 0;

        return true;
    } catch (err) {
        console.error("Ошибка загрузки из облака:", err);
        return false;
    }
}

// Заливает стартовые вопросы (и категории, если withCategories) режима в базу
async function seedInitialData(mode, withCategories) {
    const base = GAME_SETS[mode].questions;

    // Категории — только если их ещё нет
    if (withCategories) {
        const catNames = [];
        base.forEach(function (q) {
            if (!catNames.includes(q.category)) catNames.push(q.category);
        });
        for (const name of catNames) {
            const catRes = await withTimeout(
                db.from("categories").insert({ mode: mode, name: name, active: true })
            );
            if (catRes.error) console.error("Категория не залилась:", name, catRes.error);
        }
    }

    // Вопросы
    const rows = base.map(function (q) {
        return {
            mode: mode,
            category: q.category,
            question: q.question,
            answer: q.answer,
            options: q.options,
            points: q.points,
            archived: false
        };
    });
    const qInsertRes = await withTimeout(db.from("questions").insert(rows));
    if (qInsertRes.error) console.error("Вопросы не залились:", qInsertRes.error);
}


// =====================================================
// ЭЛЕМЕНТЫ СТРАНИЦЫ
// =====================================================

const board = document.getElementById("game-board");
const modal = document.getElementById("question-modal");
const questionElement = document.getElementById("question");
const optionsElement = document.getElementById("options");
const resultElement = document.getElementById("result");
const closeButton = document.getElementById("close-btn");
const resetButton = document.getElementById("reset-btn");
const scoresElement = document.querySelector(".scores");
const selectScreen = document.getElementById("select-screen");
const startScreen = document.getElementById("start-screen");
const gameScreen = document.getElementById("game-screen");
const newGameButton = document.getElementById("new-game-btn");
const setupForm = document.getElementById("setup-form");
const addPlayerButton = document.getElementById("add-player-btn");
const playerFields = document.getElementById("player-fields");
const winnerModal = document.getElementById("winner-modal");
const winnerTitle = document.getElementById("winner-title");
const winnerPlayers = document.getElementById("winner-players");
const winnerMenuButton = document.getElementById("winner-menu-btn");
const timerElement = document.getElementById("timer");
const wrongButton = document.getElementById("wrong-btn");
const roverHappy = document.getElementById("rover-happy");
const roverSad = document.getElementById("rover-sad");
const exportCsvButton = document.getElementById("export-csv-btn");
const leaderboardList = document.getElementById("leaderboard-list");
const resetLeaderboardButton = document.getElementById("reset-leaderboard-btn");
const gamesPlayedCount = document.getElementById("games-played-count");
const resetGamesCountButton = document.getElementById("reset-games-count-btn");
const questionValueElement = document.getElementById("question-value");
const rulesButton = document.getElementById("rules-btn");
const rulesModal = document.getElementById("rules-modal");
const rulesCloseButton = document.getElementById("rules-close-btn");
const selectResolverButton = document.getElementById("select-resolver-btn");
const selectOutsourceButton = document.getElementById("select-outsource-btn");
const selectCoordinatorButton = document.getElementById("select-coordinator-btn");
const selectWatcherButton = document.getElementById("select-watcher-btn");
const backToSelectButton = document.getElementById("back-to-select-btn");
const settingsButton = document.getElementById("settings-btn");
const settingsScreen = document.getElementById("settings-screen");
const settingsBackButton = document.getElementById("settings-back-btn");
const settingsResetButton = document.getElementById("settings-reset-btn");
const settingsTitle = document.getElementById("settings-title");
const qListElement = document.getElementById("q-list");
const qEditorElement = document.getElementById("q-editor");
const qAddButton = document.getElementById("q-add-btn");
const archiveCard = document.getElementById("archive-card");
const archiveListElement = document.getElementById("archive-list");
const qListCard = document.getElementById("q-list-card");
const catManageBtn = document.getElementById("cat-manage-btn");
const catModal = document.getElementById("cat-modal");
const catCloseBtn = document.getElementById("cat-close-btn");
const catAddBtn = document.getElementById("cat-add-btn");
const catNewInput = document.getElementById("cat-new-input");
const catListElement = document.getElementById("cat-list");



// =====================================================
// КАТЕГОРИИ
// =====================================================

function getAllCategories() {
    return allCategories;
}

// Сохраняет изменённую категорию в облако (по id)
async function updateCategoryInCloud(cat) {
    try {
        await withTimeout(
            db.from("categories").update({ active: cat.active }).eq("id", cat.id)
        );
    } catch (e) { console.error("Ошибка сохранения категории:", e); }
}

// Добавляет новую категорию в облако
async function addCategoryToCloud(name, active) {
    try {
        const res = await withTimeout(
            db.from("categories")
                .insert({ mode: currentGameMode, name: name, active: active })
                .select()
        );
        if (res.data && res.data.length > 0) {
            allCategories.push(res.data[0]);
        }
    } catch (e) { console.error("Ошибка добавления категории:", e); }
}

// Удаляет категорию из облака
async function deleteCategoryFromCloud(catId) {
    try {
        await withTimeout(
            db.from("categories").delete().eq("id", catId)
        );
    } catch (e) { console.error("Ошибка удаления категории:", e); }
}

function getCategories() {
    return allCategories
        .filter(function (c) { return c.active; })
        .map(function (c) { return c.name; });
}


// =====================================================
// АКТИВНЫЙ ИГРОК
// =====================================================

function updateActivePlayer() {

    document.querySelectorAll(".team-score").forEach(function (player, index) {

        player.classList.toggle(
            "active-team",
            currentPlayer === index + 1
        );

    });

}
// =====================================================
// СТОИМОСТЬ ВОПРОСА
// =====================================================

function getCurrentQuestionValue() {
    if (!currentQuestion) return 0;

    const idx = Math.min(currentQuestionWrongAttempts, ANSWER_VALUE_MULTIPLIERS.length - 1);
    const raw = currentQuestion.points * ANSWER_VALUE_MULTIPLIERS[idx];

    return Math.max(5, Math.round(raw / 5) * 5);
}

function updateQuestionValueDisplay() {
    if (!questionValueElement || !currentQuestion) return;

    const value = getCurrentQuestionValue();
    const base = currentQuestion.points;

    if (value === base) {
        questionValueElement.textContent = "💰 Вопрос стоит: " + value + " баллов";
    } else {
        questionValueElement.textContent =
            "💰 Стоимость снижена: " + value + " баллов (было " + base + ")";
    }
}


// =====================================================
// ТАЙМЕР
// =====================================================

function getTimeForPoints(points) {
    const map = { 100: 60, 200: 50, 300: 40, 400: 30, 500: 20 };
    return map[points] || 60;
}

function startTimer(seconds) {
    stopTimer();

    let timeLeft = seconds;
    timerElement.textContent = timeLeft;
    timerElement.classList.remove("timer-caution", "timer-danger");

    timerInterval = setInterval(function () {

        timeLeft -= 1;
        timerElement.textContent = timeLeft;

        if (timeLeft <= 5) {
            timerElement.classList.remove("timer-caution");
            timerElement.classList.add("timer-danger");
            playTickSound();
        } else if (timeLeft <= 10) {
            timerElement.classList.add("timer-caution");
        }

        if (timeLeft <= 0) {
            stopTimer();
            onTimeOut();
        }

    }, 1000);
}

function stopTimer() {
    if (timerInterval !== null) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    if (timeoutInterval !== null) {
        clearInterval(timeoutInterval);
        timeoutInterval = null;
    }
}

function onTimeOut() {
    if (currentQuestion === null) {
        return;
    }

    playWrongSound();

    players[currentPlayer - 1].streak = 0;
    players[currentPlayer - 1].errors += 1;

    const buttons = document.querySelectorAll(".answer-option");
    const previouslyEnabled = [];

    buttons.forEach(function (b) {
        if (!b.disabled) {
            previouslyEnabled.push(b);
            b.disabled = true;
        }
    });

    const nextPlayerNumber =
        currentPlayer === players.length ? 1 : currentPlayer + 1;
    const nextPlayerName = players[nextPlayerNumber - 1].name;

    let countdown = 5;
    resultElement.textContent =
        "⏱ Время вышло! Ход переходит игроку «" + nextPlayerName +
        "» через " + countdown + "…";

    timeoutInterval = setInterval(function () {

        countdown -= 1;

        if (countdown > 0) {
            resultElement.textContent =
                "⏱ Время вышло! Ход переходит игроку «" + nextPlayerName +
                "» через " + countdown + "…";
            return;
        }

        clearInterval(timeoutInterval);
        timeoutInterval = null;

        currentPlayer = nextPlayerNumber;
        updateActivePlayer();

        previouslyEnabled.forEach(function (b) {
            b.disabled = false;
        });

        resultElement.textContent =
            "Отвечает игрок «" + players[currentPlayer - 1].name + "».";

        startTimer(getTimeForPoints(currentQuestion.points));

        saveState();

    }, 1000);
}

// =====================================================
// РОБОТ
// =====================================================

function showHappyRover() {
    if (!roverHappy || !roverSad) return;
    roverHappy.classList.remove("hidden");
    roverSad.classList.add("hidden");
}

function showSadRover() {
    if (!roverHappy || !roverSad) return;
    roverHappy.classList.add("hidden");
    roverSad.classList.remove("hidden");
}
// =====================================================
// ТОП ИГРОКОВ
// =====================================================

function loadLeaderboard() {
    return leaderboardData;
}

// Добавляет запись в топ (облако)
async function saveLeaderboardEntry(name, score) {
    try {
        await withTimeout(
            db.from("leaderboard").insert({
                mode: currentGameMode,
                name: name,
                score: score
            })
        );
    } catch (e) { console.error("Ошибка сохранения результата:", e); }
}

// Очищает топ для текущего режима (облако)
async function clearLeaderboardInCloud() {
    try {
        await withTimeout(
            db.from("leaderboard").delete().eq("mode", currentGameMode)
        );
        leaderboardData = [];
    } catch (e) { console.error("Ошибка очистки топа:", e); }
}

function renderLeaderboard() {
    if (!leaderboardList) return;

    const board = loadLeaderboard().slice(0, 5);
    leaderboardList.innerHTML = "";

    if (board.length === 0) {
        const li = document.createElement("li");
        li.className = "empty";
        li.textContent = "Пока нет результатов";
        leaderboardList.appendChild(li);
        return;
    }

    board.forEach(function (entry) {
        const li = document.createElement("li");
        const name = document.createElement("span");
        const score = document.createElement("span");

        name.className = "lb-name";
        name.textContent = entry.name;
        score.className = "lb-score";
        score.textContent = entry.score;

        li.appendChild(name);
        li.appendChild(score);
        leaderboardList.appendChild(li);
    });
}

// =====================================================
// СЧЁТЧИК СЫГРАННЫХ ИГР
// =====================================================

function loadGamesCount() {
    return gamesCountData;
}

function renderGamesCount() {
    if (!gamesPlayedCount) return;
    gamesPlayedCount.textContent = gamesCountData;
}

// Увеличивает счётчик на 1 (облако)
async function incrementGamesCount() {
    gamesCountData += 1;
    renderGamesCount();
    try {
        await withTimeout(
            db.from("games_count")
                .upsert({ mode: currentGameMode, count: gamesCountData }, { onConflict: "mode" })
        );
    } catch (e) { console.error("Ошибка счётчика игр:", e); }
}

// Сбрасывает счётчик (облако)
async function resetGamesCountInCloud() {
    gamesCountData = 0;
    renderGamesCount();
    try {
        await withTimeout(
            db.from("games_count")
                .upsert({ mode: currentGameMode, count: 0 }, { onConflict: "mode" })
        );
    } catch (e) { console.error("Ошибка сброса счётчика:", e); }
}

// =====================================================
// ЭКСПОРТ CSV
// =====================================================

function exportCSV() {
    if (!players || players.length === 0) return;

    const rows = [];
    const dateStr = new Date().toLocaleString("ru-RU");

    rows.push(["Партия (" + (GAME_SETS[currentGameMode] ? GAME_SETS[currentGameMode].title : "") + "):", dateStr]);
    rows.push([]);
    rows.push(["Место", "Игрок", "Очки", "Верных ответов", "Ошибок", "Макс. серия", "Время игры"]);

    const duration = Math.max(1, Math.round((Date.now() - gameStartTime) / 1000));
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    const timeStr = minutes + "м " + seconds + "с";

    const sorted = players.map(function (p, i) {
        const scoreEl = document.getElementById("score" + (i + 1));
        return {
            name: p.name,
            score: scoreEl ? Number(scoreEl.textContent) : 0,
            correct: p.correct || 0,
            errors: p.errors || 0,
            maxStreak: p.maxStreak || 0
        };
    }).sort(function (a, b) { return b.score - a.score; });

    sorted.forEach(function (p, i) {
        rows.push([i + 1, p.name, p.score, p.correct, p.errors, p.maxStreak, timeStr]);
    });

    const csv = "\uFEFF" + rows.map(function (r) { return r.join(";"); }).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    const stamp = new Date().toISOString().slice(0, 16).replace("T", "_").replace(":", "-");
    a.download = currentGameMode + "_igra_" + stamp + ".csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
// =====================================================
// СОХРАНЕНИЕ СОСТОЯНИЯ
// =====================================================

function saveState() {
    if (gameScreen.classList.contains("hidden")) {
        return;
    }

    const usedCells = [];
    document.querySelectorAll(".cell").forEach(function (cell) {
        if (cell.classList.contains("used")) {
            usedCells.push(Number(cell.dataset.index));
        }
    });

    const playersState = players.map(function (player, index) {
        const scoreEl = document.getElementById("score" + (index + 1));
        return {
            name: player.name,
            score: scoreEl ? Number(scoreEl.textContent) : 0,
            correct: player.correct || 0,
            errors: player.errors || 0,
            streak: player.streak || 0,
            maxStreak: player.maxStreak || 0
        };
    });

    const state = {
        gameMode: currentGameMode,
        players: playersState,
        currentPlayer: currentPlayer,
        usedCells: usedCells,
        gameStartTime: gameStartTime,
        gameCounted: gameCounted
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function clearState() {
    localStorage.removeItem(STORAGE_KEY);
}

function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
        return false;
    }

    try {
        const state = JSON.parse(raw);
        if (!state.players || state.players.length < 2) {
            return false;
        }

        players = state.players.map(function (p) {
            return {
                name: p.name,
                score: p.score || 0,
                correct: p.correct || 0,
                errors: p.errors || 0,
                streak: p.streak || 0,
                maxStreak: p.maxStreak || 0
            };
        });
        currentPlayer = state.currentPlayer || 1;
        if (state.gameStartTime) {
            gameStartTime = state.gameStartTime;
        }
        gameCounted = state.gameCounted || false;
        startScreen.classList.add("hidden");
        gameScreen.classList.remove("hidden");

        renderScores(players.map(function (p) { return p.name; }));

        players.forEach(function (player, index) {
            const scoreEl = document.getElementById("score" + (index + 1));
            if (scoreEl) {
                scoreEl.textContent = player.score;
            }
        });

        if (state.usedCells && state.usedCells.length) {
            document.querySelectorAll(".cell").forEach(function (cell) {
                if (state.usedCells.includes(Number(cell.dataset.index))) {
                    cell.classList.add("used");
                }
            });
        }

        updateActivePlayer();

        if (isGameFinished()) {
            showWinner();
        }

        return true;
    } catch (e) {
        return false;
    }
}

// =====================================================
// ПОЛЯ ИГРОКОВ
// =====================================================

function createPlayerFieldRow(number) {

    const row = document.createElement("div");
    row.className = "player-field-row";

    const input = document.createElement("input");
    input.type = "text";
    input.className = "single-player-input";
    input.placeholder = `Имя игрока ${number}`;
    input.maxLength = 30;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "remove-player-btn";
    removeBtn.textContent = "✕";
    removeBtn.title = "Удалить игрока";

    removeBtn.addEventListener("click", function () {
        const rows = playerFields.querySelectorAll(".player-field-row");
        if (rows.length <= 2) {
            return; // минимум 2 игрока
        }
        row.remove();
        updatePlayerFieldControls();
    });

    row.appendChild(input);
    row.appendChild(removeBtn);
    return row;
}

function updatePlayerFieldControls() {
    const rows = playerFields.querySelectorAll(".player-field-row");

    rows.forEach(function (row, index) {
        const input = row.querySelector("input");
        if (input) {
            input.placeholder = `Имя игрока ${index + 1}`;
        }

        const btn = row.querySelector(".remove-player-btn");
        if (btn) {
            btn.disabled = rows.length <= 2;
        }
    });

    if (addPlayerButton) {
        addPlayerButton.disabled = rows.length >= 8;
    }
}

function renderPlayerFields() {
    playerFields.innerHTML = "";

    for (let i = 1; i <= 2; i++) {
        playerFields.appendChild(createPlayerFieldRow(i));
    }

    updatePlayerFieldControls();
}
function addPlayer() {
    const currentRows = playerFields.querySelectorAll(".player-field-row");

    if (currentRows.length >= 8) {
        alert("Максимум 8 игроков");
        return;
    }

    const row = createPlayerFieldRow(currentRows.length + 1);
    playerFields.appendChild(row);

    updatePlayerFieldControls();

    const input = row.querySelector("input");
    if (input) {
        input.focus();
    }
}


// =====================================================
// ОТОБРАЖЕНИЕ СЧЁТА
// =====================================================

function renderScores(playerNames) {

    scoresElement.innerHTML = "";

    playerNames.forEach(function (name, index) {

        const playerScore = document.createElement("div");
        const score = document.createElement("span");

        playerScore.id = "player" + (index + 1);
        playerScore.className = "team-score";

        playerScore.textContent = name + ": ";

        score.id = "score" + (index + 1);
        score.textContent = "0";

        playerScore.appendChild(score);
        scoresElement.appendChild(playerScore);

    });

    updateActivePlayer();

}


// =====================================================
// ОЧИСТКА ПОЛЯ
// =====================================================

function clearBoard() {

    document.querySelectorAll(".cell.used").forEach(function (cell) {

        cell.classList.remove("used");

    });

}


// =====================================================
// ОТКРЫТИЕ НАСТРОЕК
// =====================================================

function openSetup() {

    setupForm.classList.remove("hidden");
    newGameButton.classList.add("hidden");

    renderPlayerFields();

}


// =====================================================
// ВОЗВРАТ В МЕНЮ
// =====================================================

function returnToMenu() {

    stopTimer();

    closeQuestion();

    clearState();

    winnerModal.classList.add("hidden");

    gameScreen.classList.add("hidden");
    startScreen.classList.remove("hidden");

    // Сразу открываем форму с вводом игроков
    openSetup();

    renderLeaderboard();
    renderGamesCount();

}



// =====================================================
// ПРОВЕРКА ОКОНЧАНИЯ ИГРЫ
// =====================================================

function isGameFinished() {

    return document.querySelectorAll(".cell:not(.used)").length === 0;

}


// =====================================================
// ПОБЕДИТЕЛЬ
// =====================================================

function showWinner() {

    playWinSound();

    if (!gameCounted) {
        incrementGamesCount();
        gameCounted = true;
        saveState();
    }

    const highestScore = Math.max.apply(
        null,
        players.map(function (player, index) {

            return Number(
                document.getElementById("score" + (index + 1)).textContent
            );

        })
    );

    const winners = players.filter(function (player, index) {

        return Number(
            document.getElementById("score" + (index + 1)).textContent
        ) === highestScore;

    });

    if (winners.length > 1) {

        winnerTitle.textContent = "Ничья!";

        winnerPlayers.textContent =
            "Игроки набрали по " + highestScore + " очков.";

    } else {

        winnerTitle.textContent =
            "Победил «" + winners[0].name + "»!";

        winnerPlayers.textContent =
            "Победитель набрал " + highestScore + " очков.";

    }

    players.forEach(function (player, index) {
        const scoreEl = document.getElementById("score" + (index + 1));
        const finalScore = scoreEl ? Number(scoreEl.textContent) : 0;
        saveLeaderboardEntry(player.name, finalScore);
    });

    // Обновляем локальный топ для мгновенного отображения
    players.forEach(function (player, index) {
        const scoreEl = document.getElementById("score" + (index + 1));
        const finalScore = scoreEl ? Number(scoreEl.textContent) : 0;
        leaderboardData.push({ name: player.name, score: finalScore });
    });
    leaderboardData.sort(function (a, b) { return b.score - a.score; });
    leaderboardData = leaderboardData.slice(0, 20);

    renderLeaderboard();

    winnerModal.classList.remove("hidden");

}


// =====================================================
// СОЗДАНИЕ ИГРОВОГО ПОЛЯ (для текущей игры)
// =====================================================

function buildBoard() {

    board.innerHTML = "";

    const categories = getCategories();

    // Категории
    for (let i = 0; i < categories.length; i++) {

        const category = document.createElement("div");

        category.className = "category";
        category.textContent = categories[i];

        board.appendChild(category);

    }

    // Клетки: 5 рядов (по стоимости) × число категорий.
    // Индекс в массиве: категория * 5 + (стоимость / 100 - 1)
    for (let row = 0; row < 5; row++) {

        for (let category = 0; category < categories.length; category++) {

            const index = category * 5 + row;
            const question = questions[index];

            const cell = document.createElement("div");

            cell.className = "cell";
            cell.dataset.index = index;

            if (!question) {
                cell.textContent = "—";
                cell.classList.add("cell-empty");
                board.appendChild(cell);
                continue;
            }

            cell.textContent = question.points;

            cell.addEventListener("click", function () {

                if (cell.classList.contains("used")) {
                    return;
                }

                currentQuestion = question;
                currentQuestion.cell = cell;

                currentQuestionWrongAttempts = Number(cell.dataset.wrongAttempts || 0);

                questionAnswered = false;
                foundAnswers = [];

                questionElement.textContent = question.question;

                updateQuestionValueDisplay();

                resultElement.textContent =
                    "Ход игрока " + players[currentPlayer - 1].name;

                optionsElement.innerHTML = "";

                for (let j = 0; j < question.options.length; j++) {

                    const optionButton = document.createElement("button");

                    optionButton.textContent = question.options[j];
                    optionButton.className = "answer-option";

                    optionButton.addEventListener("click", function () {

                        checkAnswer(question.options[j]);

                    });

                    optionsElement.appendChild(optionButton);

                }

                modal.classList.remove("hidden");

                showHappyRover();

                startTimer(getTimeForPoints(question.points));
            });

            board.appendChild(cell);

        }

    }
}


// =====================================================
// ПРОВЕРКА ОТВЕТА
// =====================================================

function checkAnswer(selectedAnswer) {

    if (currentQuestion === null) {
        return;
    }

    if (questionAnswered) {
        return;
    }

    const correctAnswers = Array.isArray(currentQuestion.answer)
        ? currentQuestion.answer
        : [currentQuestion.answer];

    if (foundAnswers.includes(selectedAnswer)) {
        return;
    }

    const buttons = document.querySelectorAll(".answer-option");


    // -------------------------------------------------
    // ПРАВИЛЬНЫЙ ОТВЕТ
    // -------------------------------------------------

 if (correctAnswers.includes(selectedAnswer)) {

        foundAnswers.push(selectedAnswer);

        playCorrectSound();

        const currentValue = getCurrentQuestionValue();
        const pointsPerAnswer = Math.floor(currentValue / correctAnswers.length);

        const scoreElement =
            document.getElementById("score" + currentPlayer);

        const currentScore =
            Number(scoreElement.textContent);

        setScoreAnimated(scoreElement, currentScore + pointsPerAnswer);


        buttons.forEach(function (button) {

            if (button.textContent === selectedAnswer) {

                button.disabled = true;
                button.style.background = "#2e9d4d";
                button.style.color = "white";

            }

        });

        // Все правильные ответы найдены
        if (foundAnswers.length === correctAnswers.length) {

            questionAnswered = true;

            const player = players[currentPlayer - 1];
            player.correct += 1;
            player.streak += 1;
            if (player.streak > player.maxStreak) {
                player.maxStreak = player.streak;
            }

            if (player.streak % 3 === 0) {
                const bonus = 50;
                setScoreAnimated(scoreElement, Number(scoreElement.textContent) + bonus);
                resultElement.textContent =
                    "🔥 " + player.streak + " правильных подряд! Бонус +" + bonus + " очков!";
            } else {
                resultElement.textContent =
                    "Все правильные ответы найдены!";
            }

            // Режим «по очереди»: после отвеченного вопроса ход переходит дальше
            if (getTurnMode() === "rotate") {
                currentPlayer =
                    currentPlayer === players.length ? 1 : currentPlayer + 1;
                updateActivePlayer();
            }

            currentQuestion.cell.classList.add("used");

            saveState();

            setTimeout(function () {

                if (isGameFinished()) {

                    showWinner();

                } else {

                    closeQuestion();

                }

            }, 1500);

        } else {

            resultElement.textContent =
                "Правильно! +" +
                pointsPerAnswer +
                " очков. " +
                "Продолжайте искать правильные ответы.";

        }

    }


    // -------------------------------------------------
    // НЕПРАВИЛЬНЫЙ ОТВЕТ
    // -------------------------------------------------

    else {

        playWrongSound();

        buttons.forEach(function (button) {

            if (button.textContent === selectedAnswer) {

                button.disabled = true;
                button.style.background = "#c0392b";
                button.style.color = "white";

            }

        });


        showSadRover();

        currentQuestionWrongAttempts++;
        currentQuestion.cell.dataset.wrongAttempts = currentQuestionWrongAttempts;
        updateQuestionValueDisplay();

        players[currentPlayer - 1].streak = 0;
        players[currentPlayer - 1].errors += 1;

        currentPlayer =
            currentPlayer === players.length
                ? 1
                : currentPlayer + 1;

        updateActivePlayer();

        const nextValue = getCurrentQuestionValue();
        resultElement.textContent =
            "Неправильно! Теперь отвечает игрок «" +
            players[currentPlayer - 1].name +
            "». Вопрос теперь стоит " + nextValue + " баллов.";

        startTimer(getTimeForPoints(currentQuestion.points));

        saveState();

    }

}


// =====================================================
// ЗАКРЫТИЕ ВОПРОСА
// =====================================================

function closeQuestion() {

    stopTimer();

    modal.classList.add("hidden");

    currentQuestion = null;
    questionAnswered = false;
    foundAnswers = [];
    currentQuestionWrongAttempts = 0;

    optionsElement.innerHTML = "";
    resultElement.textContent = "";

    timerElement.classList.remove("timer-caution", "timer-danger");

    if (roverHappy && roverSad) {
        roverHappy.classList.add("hidden");
        roverSad.classList.add("hidden");
    }
}

// =====================================================
// ВЫБОР ИГРЫ
// =====================================================

async function openGame(mode) {
    setGameMode(mode);

    // Показываем экран загрузки
    selectScreen.classList.add("hidden");
    startScreen.classList.remove("hidden");
    startScreen.style.opacity = "0.5";

    // Загружаем данные из облака
    const ok = await loadGameData(mode);

    startScreen.style.opacity = "1";

    if (!ok) {
        alert("⚠️ Не удалось загрузить данные из облака. Проверь интернет и обнови страницу.");
        selectScreen.classList.remove("hidden");
        startScreen.classList.add("hidden");
        return;
    }

    buildBoard();

    renderLeaderboard();
    renderGamesCount();

    // Сразу открываем форму с вводом игроков (без кнопки "Новая игра")
    openSetup();

    // Подписываемся на живые обновления
    subscribeToChanges();

    // Пытаемся восстановить сохранённую партию этой игры (локально)
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
        loadState();
    }
}


if (selectResolverButton) {
    selectResolverButton.addEventListener("click", function () {
        openGame("resolver");
    });
}

if (selectOutsourceButton) {
    selectOutsourceButton.addEventListener("click", function () {
        openGame("outsource");
    });
}
if (selectCoordinatorButton) {
    selectCoordinatorButton.addEventListener("click", function () {
        openGame("coordinator");
    });
}

if (selectWatcherButton) {
    selectWatcherButton.addEventListener("click", function () {
        openGame("watcher");
    });
}


// =====================================================
// ОБРАБОТЧИКИ КНОПОК
// =====================================================

closeButton.addEventListener("click", function () {

    closeQuestion();

});

wrongButton.addEventListener("click", function () {

    if (currentQuestion === null) {
        return;
    }

    stopTimer();

    if (currentQuestion.cell) {
        const attempts = Number(currentQuestion.cell.dataset.wrongAttempts || 0) + 1;
        currentQuestion.cell.dataset.wrongAttempts = attempts;
    }

    players[currentPlayer - 1].streak = 0;
    players[currentPlayer - 1].errors += 1;

    currentPlayer =
        currentPlayer === players.length ? 1 : currentPlayer + 1;

    updateActivePlayer();

    closeQuestion();

    saveState();

});

newGameButton.addEventListener("click", function () {

    openSetup();

});

addPlayerButton.addEventListener("click", function () {
    addPlayer();

});

setupForm.addEventListener("submit", startGame);

function startGame(event) {
    event.preventDefault();

    clearState();

    const inputs = playerFields.querySelectorAll("input");

    players = [];

    inputs.forEach((input, index) => {
        const name = input.value.trim();

        players.push({
            name: name || `Игрок ${index + 1}`,
            score: 0,
            correct: 0,
            errors: 0,
            streak: 0,
            maxStreak: 0
        });
    });

    gameStartTime = Date.now();
    gameCounted = false;

    if (players.length < 2) {
        alert("Добавьте минимум 2 игроков");
        return;
    }

    currentPlayer = 1;

    startScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");

    renderScores(players.map(function (player) {
        return player.name;
    }));

    updateActivePlayer();
    clearBoard();

    saveState();
}


resetButton.addEventListener("click", function () {

    returnToMenu();

});

winnerMenuButton.addEventListener("click", function () {

    returnToMenu();

});
if (exportCsvButton) {
    exportCsvButton.addEventListener("click", exportCSV);
}

if (resetLeaderboardButton) {
    resetLeaderboardButton.addEventListener("click", async function () {
        if (confirm("Сбросить все результаты топа? Это действие нельзя отменить.")) {
            await clearLeaderboardInCloud();
            renderLeaderboard();
        }
    });
}
if (resetGamesCountButton) {
    resetGamesCountButton.addEventListener("click", async function () {
        if (confirm("Сбросить счётчик сыгранных игр?")) {
            await resetGamesCountInCloud();
        }
    });
}
// =====================================================
// МОДАЛКА ПРАВИЛ
// =====================================================

if (rulesButton) {
    rulesButton.addEventListener("click", function () {
        rulesModal.classList.remove("hidden");
    });
}

if (rulesCloseButton) {
    rulesCloseButton.addEventListener("click", function () {
        rulesModal.classList.add("hidden");
    });
}

if (rulesModal) {
    rulesModal.addEventListener("click", function (e) {
        if (e.target === rulesModal) {
            rulesModal.classList.add("hidden");
        }
    });
}

document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && rulesModal && !rulesModal.classList.contains("hidden")) {
        rulesModal.classList.add("hidden");
    }
});

// =====================================================
// КНОПКА "НАЗАД К ВЫБОРУ ИГРЫ"
// =====================================================

if (backToSelectButton) {
    backToSelectButton.addEventListener("click", function () {

        stopTimer();
        closeQuestion();

        // Отписываемся от обновлений
        if (realtimeChannel) {
            db.removeChannel(realtimeChannel);
            realtimeChannel = null;
        }

        startScreen.classList.add("hidden");
        gameScreen.classList.add("hidden");
        winnerModal.classList.add("hidden");
        selectScreen.classList.remove("hidden");

        setupForm.classList.add("hidden");
        newGameButton.classList.remove("hidden");

    });
}

// =====================================================
// ТЁМНАЯ ТЕМА
// =====================================================

const THEME_KEY = "svoya-igra-theme";
const themeToggleButton = document.getElementById("theme-toggle-btn");

function applyTheme(theme) {
    if (theme === "dark") {
        document.body.classList.add("dark-theme");
        if (themeToggleButton) themeToggleButton.textContent = "☀️";
    } else {
        document.body.classList.remove("dark-theme");
        if (themeToggleButton) themeToggleButton.textContent = "🌙";
    }
}

// Восстанавливаем сохранённую тему при загрузке
applyTheme(localStorage.getItem(THEME_KEY) || "light");

if (themeToggleButton) {
    themeToggleButton.addEventListener("click", function () {
        const isDark = document.body.classList.contains("dark-theme");
        const nextTheme = isDark ? "light" : "dark";
        localStorage.setItem(THEME_KEY, nextTheme);
        applyTheme(nextTheme);
    });
}

// =====================================================
// ЗВУК И НАСТРОЙКИ ИГРЫ
// =====================================================

const SOUND_KEY = "svoya-igra-sound";
const TURN_MODE_KEY = "svoya-igra-turn-mode";

function isSoundOn() {
    return localStorage.getItem(SOUND_KEY) !== "off";
}

function getTurnMode() {
    return localStorage.getItem(TURN_MODE_KEY) || "until-wrong";
}

let audioCtx = null;

function getAudioCtx() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
}

function playTone(freq, startOffset, duration, type) {
    if (!isSoundOn()) return;
    try {
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t = ctx.currentTime + startOffset;
        osc.type = type || "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.2, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + duration + 0.05);
    } catch (e) { }
}

function playCorrectSound() {
    playTone(523, 0, 0.15);
    playTone(659, 0.12, 0.15);
    playTone(784, 0.24, 0.3);
}

function playWrongSound() {
    playTone(220, 0, 0.25, "sawtooth");
    playTone(147, 0.18, 0.35, "sawtooth");
}

function playTickSound() {
    playTone(1000, 0, 0.06, "square");
}

function playWinSound() {
    playTone(523, 0, 0.2);
    playTone(659, 0.18, 0.2);
    playTone(784, 0.36, 0.2);
    playTone(1047, 0.54, 0.45);
}

// Анимация «докрутки» очков
function setScoreAnimated(scoreElement, target) {
    if (!scoreElement) return;
    const from = Number(scoreElement.textContent) || 0;
    if (scoreElement._scoreRaf) cancelAnimationFrame(scoreElement._scoreRaf);
    if (from === target) return;
    const duration = 600;
    const startTime = performance.now();

    function step(now) {
        const t = Math.min((now - startTime) / duration, 1);
        scoreElement.textContent = Math.round(from + (target - from) * t);
        if (t < 1) {
            scoreElement._scoreRaf = requestAnimationFrame(step);
        }
    }
    scoreElement._scoreRaf = requestAnimationFrame(step);
}

// Модалка настроек игры
const gameSettingsModal = document.getElementById("game-settings-modal");
const gsSoundCheckbox = document.getElementById("gs-sound");
const gsCloseBtn = document.getElementById("gs-close-btn");
const gameSettingsBtnStart = document.getElementById("game-settings-btn-start");

function openGameSettings() {
    if (!gameSettingsModal) return;
    if (gsSoundCheckbox) gsSoundCheckbox.checked = isSoundOn();
    const mode = getTurnMode();
    const radio = document.querySelector('input[name="gs-turn-mode"][value="' + mode + '"]');
    if (radio) radio.checked = true;
    gameSettingsModal.classList.remove("hidden");
}

function closeGameSettings() {
    if (gameSettingsModal) gameSettingsModal.classList.add("hidden");
}

if (gameSettingsBtnStart) gameSettingsBtnStart.addEventListener("click", openGameSettings);
if (gsCloseBtn) gsCloseBtn.addEventListener("click", closeGameSettings);
if (gsSoundCheckbox) {
    gsSoundCheckbox.addEventListener("change", function () {
        localStorage.setItem(SOUND_KEY, gsSoundCheckbox.checked ? "on" : "off");
    });
}
document.querySelectorAll('input[name="gs-turn-mode"]').forEach(function (radio) {
    radio.addEventListener("change", function () {
        localStorage.setItem(TURN_MODE_KEY, radio.value);
    });
});
if (gameSettingsModal) {
    gameSettingsModal.addEventListener("click", function (e) {
        if (e.target === gameSettingsModal) closeGameSettings();
    });
}

// =====================================================
// РЕДАКТОР ВОПРОСОВ (НАСТРОЙКИ)
// =====================================================

let qEditIndex = -1;
let qEditSource = "board"; // "board" — вопрос на поле, "archive" — вопрос в архиве

function getBaseQuestions(mode) {
    return GAME_SETS[mode].questions;
}

function cloneQuestion(q) {
    return {
        category: q.category,
        question: q.question,
        answer: Array.isArray(q.answer) ? q.answer.slice() : q.answer,
        options: q.options.slice(),
        points: q.points
    };
}

// Вопросы уже загружены из облака в loadGameData — просто возвращаем
function getEffectiveQuestions() {
    return questions;
}

// Сохраняет вопрос в облако (вставка нового или обновление по id).
// archived=true — вопрос остаётся в архиве, иначе — на поле.
async function saveQuestionToCloud(q, targetIndex, archived) {
    try {
        const row = {
            mode: currentGameMode,
            category: q.category,
            question: q.question,
            answer: q.answer,
            options: q.options,
            points: q.points,
            archived: archived === true
        };
        if (q.id) {
            // Обновляем существующий
            await withTimeout(
                db.from("questions").update(row).eq("id", q.id)
            );
        } else {
            // Новый вопрос
            const res = await withTimeout(
                db.from("questions").insert(row).select()
            );
            if (res.data && res.data.length > 0) {
                q.id = res.data[0].id;
                if (targetIndex !== undefined && questions[targetIndex]) {
                    questions[targetIndex].id = q.id;
                }
            }
        }
    } catch (e) { console.error("Ошибка сохранения вопроса:", e); }
}

// Удаляет вопрос из облака
async function deleteQuestionFromCloud(q) {
    if (!q.id) return;
    try {
        await withTimeout(
            db.from("questions").delete().eq("id", q.id)
        );
    } catch (e) { console.error("Ошибка удаления вопроса:", e); }
}

// Помечает вопрос как архивный в облаке
async function archiveQuestionInCloud(q) {
    if (!q.id) return;
    try {
        await withTimeout(
            db.from("questions").update({ archived: true }).eq("id", q.id)
        );
    } catch (e) { console.error("Ошибка архивации:", e); }
}

// Возвращает вопрос из архива на поле в облаке
async function restoreQuestionInCloud(q) {
    if (!q.id) return;
    try {
        await withTimeout(
            db.from("questions").update({ archived: false }).eq("id", q.id)
        );
    } catch (e) { console.error("Ошибка восстановления:", e); }
}

function openSettings() {
    startScreen.classList.add("hidden");
    settingsScreen.classList.remove("hidden");

    const set = GAME_SETS[currentGameMode];
    if (settingsTitle && set) {
        settingsTitle.textContent = "Настройки вопросов: " + set.title;
    }

    qEditIndex = -1;
    qEditSource = "board";
    renderQuestionList();
    renderEditor();
    renderArchive();
}

function closeSettings() {
    settingsScreen.classList.add("hidden");
    startScreen.classList.remove("hidden");
}

function renderQuestionList() {
    qListElement.innerHTML = "";

    const categories = getCategories();
    const total = categories.length * 5;
    while (questions.length < total) questions.push(null);
    if (questions.length > total) questions.length = total;

    questions.forEach(function (q, index) {
        // Заголовок категории перед первым вопросом каждой пятёрки
        if (index % 5 === 0) {
            const header = document.createElement("div");
            header.className = "q-cat-header";
            header.textContent = categories[Math.floor(index / 5)] || "Категория";
            qListElement.appendChild(header);
        }

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "q-item" + (qEditSource === "board" && index === qEditIndex ? " q-item-active" : "");

        const meta = document.createElement("span");
        meta.className = "q-item-meta";

        const text = document.createElement("span");
        text.className = "q-item-text";

        if (!q) {
            btn.classList.add("q-item-empty");
            meta.textContent = "Пустая клетка";
            text.textContent = "Нажмите, чтобы заполнить";
        } else {
            meta.textContent = q.points + " баллов";
            text.textContent = q.question;
        }

        btn.appendChild(meta);
        btn.appendChild(text);

        // Кнопка «В архив» — только у заполненных вопросов
        if (q) {
            const archiveBtn = document.createElement("button");
            archiveBtn.type = "button";
            archiveBtn.className = "archive-restore-btn q-archive-btn";
            archiveBtn.textContent = "📦 В архив";
            archiveBtn.title = "Отправить вопрос в архив";
            archiveBtn.addEventListener("click", function (e) {
                e.stopPropagation();
                archiveQuestion(index);
            });
            btn.appendChild(archiveBtn);
        }

        btn.addEventListener("click", function () {
            qEditSource = "board";
            qEditIndex = index;
            renderQuestionList();
            renderEditor();
            renderArchive();
        });

        // Перетаскивание в архив
        if (q) {
            btn.draggable = true;
            btn.addEventListener("dragstart", function (e) {
                e.dataTransfer.setData("text/plain", String(index));
                e.dataTransfer.effectAllowed = "move";
                btn.classList.add("q-item-dragging");
            });
            btn.addEventListener("dragend", function () {
                btn.classList.remove("q-item-dragging");
            });
        }

        qListElement.appendChild(btn);
    });
}

function renderEditor() {
    qEditorElement.innerHTML = "";

    const total = getCategories().length * 5;
    while (questions.length < total) questions.push(null);
    if (questions.length > total) questions.length = total;

    let q = null;

    if (qEditSource === "archive") {
        const archive = loadArchive();
        if (qEditIndex >= 0 && qEditIndex < archive.length) {
            q = archive[qEditIndex];
        }
    } else if (qEditIndex >= 0 && qEditIndex < questions.length) {
        // Пустая клетка — черновик с привязкой к её категории и стоимости
        const slotCategories = getCategories();
        const slotCat = slotCategories[Math.floor(qEditIndex / 5)] || slotCategories[0];
        const slotPoints = (qEditIndex % 5 + 1) * 100;

        q = questions[qEditIndex] || {
            category: slotCat,
            question: "",
            answer: "",
            options: ["", ""],
            points: slotPoints
        };
    }

    if (!q) {
        const hint = document.createElement("p");
        hint.className = "q-editor-hint";
        hint.textContent = "Выберите вопрос слева или из архива.";
        qEditorElement.appendChild(hint);
        return;
    }

    const correctAnswers = Array.isArray(q.answer) ? q.answer.slice() : (q.answer ? [q.answer] : []);

    // --- Категория (только из существующих) ---
    const catLabel = document.createElement("label");
    catLabel.className = "q-field-label";
    catLabel.textContent = "Категория";
    const catSelect = document.createElement("select");
    catSelect.className = "q-select";
    getCategories().forEach(function (cat) {
        const opt = document.createElement("option");
        opt.value = cat;
        opt.textContent = cat;
        if (cat === q.category) opt.selected = true;
        catSelect.appendChild(opt);
    });
    // Если категория вопроса нестандартная — показываем её тоже
    if (!getCategories().includes(q.category)) {
        const opt = document.createElement("option");
        opt.value = q.category;
        opt.textContent = q.category;
        opt.selected = true;
        catSelect.appendChild(opt);
    }
    catLabel.appendChild(catSelect);
    qEditorElement.appendChild(catLabel);

    // --- Сложность (стоимость) ---
    const pointsLabel = document.createElement("label");
    pointsLabel.className = "q-field-label";
    pointsLabel.textContent = "Сложность (стоимость)";
    const pointsSelect = document.createElement("select");
    pointsSelect.className = "q-select";
    [100, 200, 300, 400, 500].forEach(function (p) {
        const opt = document.createElement("option");
        opt.value = p;
        opt.textContent = p + " баллов — " + getTimeForPoints(p) + " сек";
        if (p === q.points) opt.selected = true;
        pointsSelect.appendChild(opt);
    });
    pointsLabel.appendChild(pointsSelect);
    qEditorElement.appendChild(pointsLabel);

    // --- Текст вопроса ---
    const qLabel = document.createElement("label");
    qLabel.className = "q-field-label";
    qLabel.textContent = "Вопрос";
    const qTextarea = document.createElement("textarea");
    qTextarea.className = "q-textarea";
    qTextarea.value = q.question;
    qTextarea.rows = 3;
    qLabel.appendChild(qTextarea);
    qEditorElement.appendChild(qLabel);

    // --- Варианты ответов ---
    const optTitle = document.createElement("p");
    optTitle.className = "q-field-label";
    optTitle.textContent = "Варианты ответов (отметьте правильные):";
    qEditorElement.appendChild(optTitle);

    const optionInputs = [];
    const optionChecks = [];

    q.options.forEach(function (optText) {
        const row = document.createElement("div");
        row.className = "q-option-row";

        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.className = "q-option-check";
        cb.checked = correctAnswers.includes(optText);
        cb.title = "Правильный ответ";

        const inp = document.createElement("input");
        inp.type = "text";
        inp.className = "single-player-input";
        inp.value = optText;

        const del = document.createElement("button");
        del.type = "button";
        del.className = "remove-player-btn";
        del.textContent = "✕";
        del.title = "Удалить вариант";
        del.addEventListener("click", function () {
            const i = optionInputs.indexOf(inp);
            if (i !== -1) {
                optionInputs.splice(i, 1);
                optionChecks.splice(i, 1);
            }
            row.remove();
        });

        row.appendChild(cb);
        row.appendChild(inp);
        row.appendChild(del);
        qEditorElement.appendChild(row);

        optionInputs.push(inp);
        optionChecks.push(cb);
    });

    // --- Кнопка добавления варианта ---
    const addOptBtn = document.createElement("button");
    addOptBtn.type = "button";
    addOptBtn.className = "add-player-btn";
    addOptBtn.textContent = "+ Добавить вариант";
    addOptBtn.addEventListener("click", function () {
        const row = document.createElement("div");
        row.className = "q-option-row";

        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.className = "q-option-check";
        cb.title = "Правильный ответ";

        const inp = document.createElement("input");
        inp.type = "text";
        inp.className = "single-player-input";
        inp.placeholder = "Новый вариант";

        const del = document.createElement("button");
        del.type = "button";
        del.className = "remove-player-btn";
        del.textContent = "✕";
        del.title = "Удалить вариант";
        del.addEventListener("click", function () {
            const i = optionInputs.indexOf(inp);
            if (i !== -1) {
                optionInputs.splice(i, 1);
                optionChecks.splice(i, 1);
            }
            row.remove();
        });

        row.appendChild(cb);
        row.appendChild(inp);
        row.appendChild(del);
        qEditorElement.insertBefore(row, addOptBtn);

        optionInputs.push(inp);
        optionChecks.push(cb);
        inp.focus();
    });
    qEditorElement.appendChild(addOptBtn);

    // --- Кнопки действий ---
    const actions = document.createElement("div");
    actions.className = "q-actions";

    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "primary-button";
    saveBtn.textContent = "💾 Сохранить вопрос";
    saveBtn.addEventListener("click", async function () {
        const newOptions = [];
        const newAnswers = [];

        optionInputs.forEach(function (inp, i) {
            const text = inp.value.trim();
            if (text === "") return;
            if (newOptions.includes(text)) return;
            newOptions.push(text);
            if (optionChecks[i].checked) {
                newAnswers.push(text);
            }
        });

        if (qTextarea.value.trim() === "") {
            alert("Введите текст вопроса");
            return;
        }
        if (newOptions.length < 2) {
            alert("Нужно минимум 2 варианта ответа");
            return;
        }
        if (newAnswers.length === 0) {
            alert("Отметьте хотя бы один правильный ответ");
            return;
        }

        const updated = {
            category: catSelect.value,
            question: qTextarea.value.trim(),
            answer: newAnswers.length === 1 ? newAnswers[0] : newAnswers,
            options: newOptions,
            points: Number(pointsSelect.value)
        };

        // Вопрос из архива — просто обновляем его на месте (остаётся в архиве!)
        if (qEditSource === "archive") {
            const oldQ = archiveData[qEditIndex];
            // Переносим id, если был
            if (oldQ && oldQ.id) updated.id = oldQ.id;
            archiveData[qEditIndex] = updated;
            await saveQuestionToCloud(updated, undefined, true);
            renderArchive();
            renderEditor();

            const savedA = document.createElement("p");
            savedA.className = "q-saved-note";
            savedA.textContent = "✅ Сохранено (в архиве)";
            qEditorElement.appendChild(savedA);
            return;
        }

        // Целевая клетка: категория × стоимость
        const categories = getCategories();
        const catIndex = categories.indexOf(updated.category);
        const row = updated.points / 100 - 1;
        const targetIndex = catIndex * 5 + row;

        if (targetIndex !== qEditIndex) {
            const occupant = questions[targetIndex];

            if (occupant) {
                const replace = confirm(
                    "Клетка «" + updated.category + " — " + updated.points +
                    "» уже занята вопросом:\n\n«" + occupant.question +
                    "»\n\nЗаменить его? (Старый вопрос будет удалён)\n\nОК — заменить, Отмена — отменить."
                );
                if (!replace) {
                    return;
                }
                // Удаляем старый вопрос из облака
                await deleteQuestionFromCloud(occupant);
            }

            // Очищаем старую клетку и ставим вопрос на новую
            const oldQ = questions[qEditIndex];
            if (oldQ && oldQ.id) {
                // Удаляем старую запись
                await deleteQuestionFromCloud(oldQ);
            }
            questions[qEditIndex] = null;
            questions[targetIndex] = updated;
            qEditIndex = targetIndex;
        } else {
            // Переносим id, если редактировали существующий
            const oldQ = questions[qEditIndex];
            if (oldQ && oldQ.id) updated.id = oldQ.id;
            questions[qEditIndex] = updated;
        }

        // Сохраняем в облако
        await saveQuestionToCloud(updated, qEditIndex);

        buildBoard();
        renderQuestionList();
        renderEditor();

        const saved = document.createElement("p");
        saved.className = "q-saved-note";
        saved.textContent = "✅ Сохранено";
        qEditorElement.appendChild(saved);
    });

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "reset-leaderboard-btn";
    delBtn.textContent = "🗑 Удалить вопрос";
    delBtn.addEventListener("click", async function () {
        if (qEditSource === "archive") {
            if (!confirm("Удалить этот вопрос из архива навсегда?")) return;
            const q = archiveData[qEditIndex];
            await deleteQuestionFromCloud(q);
            archiveData.splice(qEditIndex, 1);
            qEditIndex = -1;
            renderArchive();
            renderEditor();
            return;
        }

        if (!confirm("Удалить этот вопрос? Клетка на поле станет пустой.")) return;
        const q = questions[qEditIndex];
        await deleteQuestionFromCloud(q);
        questions[qEditIndex] = null;
        buildBoard();
        qEditIndex = -1;
        renderQuestionList();
        renderEditor();
    });

    actions.appendChild(saveBtn);
    actions.appendChild(delBtn);
    qEditorElement.appendChild(actions);
}

// =====================================================
// АРХИВ ВОПРОСОВ
// =====================================================

function loadArchive() {
    return archiveData;
}

// Архив теперь часть таблицы questions (archived=true) —
// сохранение происходит через saveQuestionToCloud / archiveQuestionInCloud
function saveArchive() {
    // Ничего не делаем локально — облако уже обновлено
}

function renderArchive() {
    if (!archiveListElement) return;

    archiveListElement.innerHTML = "";
    const archive = loadArchive();

    if (archive.length === 0) {
        const empty = document.createElement("p");
        empty.className = "archive-empty";
        empty.textContent = "Архив пуст";
        archiveListElement.appendChild(empty);
        return;
    }

    // Группируем по категориям (без лимита количества вопросов)
    const groups = new Map();
    archive.forEach(function (q, index) {
        const cat = q.category || "Без категории";
        if (!groups.has(cat)) groups.set(cat, []);
        groups.get(cat).push({ q: q, index: index });
    });

    groups.forEach(function (items, cat) {
        const header = document.createElement("div");
        header.className = "q-cat-header";
        header.textContent = cat;
        archiveListElement.appendChild(header);

        items.forEach(function (entry) {
            const q = entry.q;
            const index = entry.index;
            const item = document.createElement("div");
            item.className = "q-item archive-item" +
                (qEditSource === "archive" && qEditIndex === index ? " q-item-active" : "");

            item.draggable = true;

            const meta = document.createElement("span");
            meta.className = "q-item-meta";
            meta.textContent = q.points + " баллов";

            const text = document.createElement("span");
            text.className = "q-item-text";
            text.textContent = q.question;

            const restoreBtn = document.createElement("button");
            restoreBtn.type = "button";
            restoreBtn.className = "archive-restore-btn";
            restoreBtn.textContent = "↩ Вернуть";
            restoreBtn.title = "Вернуть вопрос на поле";
            restoreBtn.addEventListener("click", function (e) {
                e.stopPropagation();
                restoreFromArchive(index);
            });

            const deleteBtn = document.createElement("button");
            deleteBtn.type = "button";
            deleteBtn.className = "archive-delete-btn";
            deleteBtn.textContent = "🗑";
            deleteBtn.title = "Удалить навсегда";
            deleteBtn.addEventListener("click", async function (e) {
                e.stopPropagation();
                if (!confirm("Удалить вопрос из архива навсегда?")) return;
                const q = archiveData[index];
                await deleteQuestionFromCloud(q);
                archiveData.splice(index, 1);
                if (qEditSource === "archive") {
                    if (qEditIndex === index) {
                        qEditIndex = -1;
                    } else if (qEditIndex > index) {
                        qEditIndex -= 1;
                    }
                }
                renderArchive();
                renderEditor();
            });

            const actions = document.createElement("div");
            actions.className = "archive-item-actions";
            actions.appendChild(restoreBtn);
            actions.appendChild(deleteBtn);

            item.appendChild(meta);
            item.appendChild(text);
            item.appendChild(actions);

            // Клик — редактировать вопрос прямо в архиве
            item.addEventListener("click", function () {
                qEditSource = "archive";
                qEditIndex = index;
                renderQuestionList();
                renderArchive();
                renderEditor();
            });

            // Перетаскивание из архива обратно в список вопросов
            item.addEventListener("dragstart", function (e) {
                e.dataTransfer.setData("text/archive-index", String(index));
                e.dataTransfer.effectAllowed = "move";
                item.classList.add("q-item-dragging");
            });
            item.addEventListener("dragend", function () {
                item.classList.remove("q-item-dragging");
            });

            archiveListElement.appendChild(item);
        });
    });
}

function archiveQuestion(index) {
    const q = questions[index];
    if (!q) return;

    // В облако: помечаем как архивный
    archiveQuestionInCloud(q);

    // Локально: переносим в архивный массив
    archiveData.push(cloneQuestion(q));
    questions[index] = null;

    if (qEditSource === "board" && qEditIndex === index) {
        qEditIndex = -1;
    }

    buildBoard();
    renderQuestionList();
    renderEditor();
    renderArchive();
}

function restoreFromArchive(archiveIndex) {
    const q = archiveData[archiveIndex];
    if (!q) return;

    // Ищем «родную» клетку: категория × стоимость
    const categories = getCategories();
    const catIndex = categories.indexOf(q.category);
    const row = q.points / 100 - 1;

    if (catIndex === -1 || row < 0 || row > 4) {
        // Родной клетки нет — ищем любую свободную
        const anyFree = questions.findIndex(function (item) { return !item; });
        if (anyFree === -1) {
            alert("Нет свободных клеток. Освободите клетку, отправив вопрос в архив.");
            return;
        }
        questions[anyFree] = q;
        qEditSource = "board";
        qEditIndex = anyFree;
    } else {
        const targetIndex = catIndex * 5 + row;

        if (questions[targetIndex]) {
            alert("Клетка «" + q.category + " — " + q.points + "» занята. Освободите её или отредактируйте вопрос после возврата.");
            return;
        }

        questions[targetIndex] = q;
        qEditSource = "board";
        qEditIndex = targetIndex;
    }

    // В облако: помечаем как не-архивный
    restoreQuestionInCloud(q);

    // Локально: убираем из архива
    archiveData.splice(archiveIndex, 1);

    buildBoard();
    renderQuestionList();
    renderEditor();
    renderArchive();
}

// Зона сброса в архив (только вопросы с поля — text/plain)
if (archiveCard) {
    archiveCard.addEventListener("dragover", function (e) {
        if (e.dataTransfer.types.indexOf("text/archive-index") !== -1) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        archiveCard.classList.add("archive-drop-target");
    });

    archiveCard.addEventListener("dragleave", function () {
        archiveCard.classList.remove("archive-drop-target");
    });

    archiveCard.addEventListener("drop", function (e) {
        archiveCard.classList.remove("archive-drop-target");

        const data = e.dataTransfer.getData("text/plain");
        if (data === "") return;

        e.preventDefault();

        const index = Number(data);
        if (!isNaN(index) && index >= 0 && index < questions.length) {
            archiveQuestion(index);
        }
    });
}

// Зона сброса в список вопросов (только из архива — text/archive-index)
if (qListCard) {
    qListCard.addEventListener("dragover", function (e) {
        if (e.dataTransfer.types.indexOf("text/archive-index") === -1) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        qListCard.classList.add("archive-drop-target");
    });

    qListCard.addEventListener("dragleave", function () {
        qListCard.classList.remove("archive-drop-target");
    });

    qListCard.addEventListener("drop", function (e) {
        qListCard.classList.remove("archive-drop-target");

        const data = e.dataTransfer.getData("text/archive-index");
        if (data === "") return;

        e.preventDefault();

        const archiveIndex = Number(data);
        if (!isNaN(archiveIndex)) {
            restoreFromArchive(archiveIndex);
        }
    });
}

// --- Обработчики настроек ---

if (settingsButton) {
    settingsButton.addEventListener("click", openSettings);
}

if (settingsBackButton) {
    settingsBackButton.addEventListener("click", closeSettings);
}

if (qAddButton) {
    qAddButton.addEventListener("click", async function () {
        // Новый вопрос падает в архив — оттуда его можно перетащить на поле
        const cats = getCategories();

        const newQ = {
            category: cats[0] || "Категория 1",
            question: "",
            answer: "",
            options: ["", ""],
            points: 100
        };

        // Сохраняем в облако как архивный
        try {
            const res = await withTimeout(
                db.from("questions").insert({
                    mode: currentGameMode,
                    category: newQ.category,
                    question: newQ.question,
                    answer: newQ.answer,
                    options: newQ.options,
                    points: newQ.points,
                    archived: true
                }).select()
            );
            if (res.data && res.data.length > 0) {
                newQ.id = res.data[0].id;
            }
        } catch (e) { console.error("Ошибка добавления:", e); }

        archiveData.push(newQ);

        // Сразу открываем его в редакторе
        qEditSource = "archive";
        qEditIndex = archiveData.length - 1;

        renderArchive();
        renderQuestionList();
        renderEditor();
    });
}

if (settingsResetButton) {
    settingsResetButton.addEventListener("click", async function () {
        // Пароль на сброс — чтобы случайно не стереть общие вопросы
        const RESET_PASSWORD_PARTS = ["svoia-igra", "2282"];
        const entered = prompt("Для сброса к стандартным вопросам введите пароль:");
        if (entered === null) return; // нажал «Отмена»
        if (entered !== RESET_PASSWORD_PARTS.join("")) {
            alert("Неверный пароль. Сброс отменён.");
            return;
        }
        if (!confirm("Сбросить все вопросы и категории этого режима к стандартным? Ваши правки будут удалены.")) return;

        // Удаляем все вопросы и категории режима из облака
        try {
            await withTimeout(db.from("questions").delete().eq("mode", currentGameMode));
            await withTimeout(db.from("categories").delete().eq("mode", currentGameMode));
        } catch (e) { console.error("Ошибка сброса:", e); }

        // Заливаем стартовые заново
        await seedInitialData(currentGameMode, true);

        // Перезагружаем
        await loadGameData(currentGameMode);
        buildBoard();
        qEditIndex = -1;
        renderQuestionList();
        renderEditor();
        renderArchive();
    });
}

// =====================================================
// УПРАВЛЕНИЕ КАТЕГОРИЯМИ
// =====================================================

function openCatModal() {
    if (catModal) {
        renderCatList();
        catModal.classList.remove("hidden");
    }
}

function closeCatModal() {
    if (catModal) catModal.classList.add("hidden");
    // После изменения категорий — перестраиваем доску
    buildBoard();
    qEditIndex = -1;
    renderQuestionList();
    renderEditor();
}

// Перемещает все вопросы категории с поля в архив
function moveCategoryQuestionsToArchive(catName) {
    const indexes = [];
    questions.forEach(function (q, i) {
        if (q && q.category === catName) indexes.push(i);
    });
    if (indexes.length === 0) return;

    indexes.forEach(function (i) {
        const q = questions[i];
        // В облако: помечаем архивным
        archiveQuestionInCloud(q);
        // Локально: в архив
        archiveData.push(cloneQuestion(q));
        questions[i] = null;
    });

    if (qEditSource === "board" && qEditIndex >= 0 && !questions[qEditIndex]) {
        qEditIndex = -1;
    }

    buildBoard();
    renderQuestionList();
    renderArchive();
    renderEditor();
}

function renderCatList() {
    if (!catListElement) return;
    catListElement.innerHTML = "";

    const all = getAllCategories();
    const activeCount = all.filter(function (c) { return c.active; }).length;

    all.forEach(function (cat, index) {
        const row = document.createElement("div");
        row.className = "cat-row" + (cat.active ? " cat-row-active" : "");

        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "cat-toggle-btn";
        toggle.textContent = cat.active ? "✅ Активна" : "⬜ Неактивна";
        toggle.title = cat.active ? "Скрыть категорию с поля" : "Показать категорию на поле";
        toggle.addEventListener("click", function () {
            const currentActive = all.filter(function (c) { return c.active; }).length;
            if (!cat.active && currentActive >= 5) {
                alert("Максимум 5 активных категорий. Сначала отключите одну из активных.");
                return;
            }
            if (cat.active) {
                const catQuestionIndexes = [];
                questions.forEach(function (q, i) {
                    if (q && q.category === cat.name) catQuestionIndexes.push(i);
                });
                if (catQuestionIndexes.length > 0) {
                    if (!confirm("В категории «" + cat.name + "» есть " + catQuestionIndexes.length + " вопрос(ов). При отключении они переместятся в архив. Продолжить?")) {
                        return;
                    }
                    catQuestionIndexes.forEach(function (i) {
                        archiveQuestionInCloud(questions[i]);
                        archiveData.push(cloneQuestion(questions[i]));
                        questions[i] = null;
                    });
                    if (qEditSource === "board" && qEditIndex >= 0 && questions[qEditIndex] === null) {
                        qEditIndex = -1;
                        qEditSource = "board";
                    }
                    buildBoard();
                    renderQuestionList();
                    renderArchive();
                    renderEditor();
                }
            }
            cat.active = !cat.active;
            updateCategoryInCloud(cat);
            renderCatList();
        });

        const nameSpan = document.createElement("span");
        nameSpan.className = "cat-name";
        nameSpan.textContent = cat.name;

        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "remove-player-btn";
        delBtn.textContent = "🗑️";
        delBtn.title = "Удалить категорию";
        delBtn.addEventListener("click", async function () {
            const count = questions.filter(function (q) { return q && q.category === cat.name; }).length;
            if (count > 0) {
                if (!confirm("В категории «" + cat.name + "» вопросов: " + count + ". Категория будет удалена, а её вопросы переместятся в архив. Продолжить?")) {
                    return;
                }
                moveCategoryQuestionsToArchive(cat.name);
            }
            all.splice(index, 1);
            await deleteCategoryFromCloud(cat.id);
            renderCatList();
        });

        row.appendChild(toggle);
        row.appendChild(nameSpan);
        row.appendChild(delBtn);
        catListElement.appendChild(row);
    });

    // Подсказка о лимите
    const limitNote = document.createElement("p");
    limitNote.className = "cat-limit-note";
    limitNote.textContent = "Активных: " + activeCount + " / 5";
    catListElement.appendChild(limitNote);
}

async function addNewCategory() {
    const name = catNewInput.value.trim();
    if (!name) {
        alert("Введите название категории");
        return;
    }

    const all = getAllCategories();
    if (all.some(function (c) { return c.name === name; })) {
        alert("Категория «" + name + "» уже существует");
        return;
    }

    const activeCount = all.filter(function (c) { return c.active; }).length;
    const newActive = activeCount < 5;

    await addCategoryToCloud(name, newActive);
    catNewInput.value = "";
    renderCatList();
}

if (catManageBtn) {
    catManageBtn.addEventListener("click", openCatModal);
}
if (catCloseBtn) {
    catCloseBtn.addEventListener("click", closeCatModal);
}
if (catAddBtn) {
    catAddBtn.addEventListener("click", addNewCategory);
}
if (catNewInput) {
    catNewInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
            e.preventDefault();
            addNewCategory();
        }
    });
}
if (catModal) {
    catModal.addEventListener("click", function (e) {
        if (e.target === catModal) {
            closeCatModal();
        }
    });
}

// =====================================================
// ЖИВОЕ ОБНОВЛЕНИЕ (Realtime)
// Когда коллега меняет вопросы/топ/счётчик — видим сразу
// =====================================================

let realtimeChannel = null;

function subscribeToChanges() {
    if (!db) return;

    // Отписываемся от старого канала
    if (realtimeChannel) {
        db.removeChannel(realtimeChannel);
    }

    realtimeChannel = db
        .channel("game-updates-" + currentGameMode)
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "questions",
                filter: "mode=eq." + currentGameMode
            },
            function () { onCloudChange(); }
        )
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "categories",
                filter: "mode=eq." + currentGameMode
            },
            function () { onCloudChange(); }
        )
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "leaderboard",
                filter: "mode=eq." + currentGameMode
            },
            function () { onCloudChange(); }
        )
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "games_count",
                filter: "mode=eq." + currentGameMode
            },
            function () { onCloudChange(); }
        )
        .subscribe();
}

// Что делать при изменении в облаке
async function onCloudChange() {
    if (isSeeding) return; // не мешаем первичной заливке

    const ok = await loadGameData(currentGameMode);
    if (!ok) return;

    // Обновляем то, что видно на экране
    if (!gameScreen.classList.contains("hidden")) {
        buildBoard();
    }
    renderLeaderboard();
    renderGamesCount();
    if (!settingsScreen.classList.contains("hidden")) {
        renderQuestionList();
        renderArchive();
    }
}

