export interface ILang{
  lang: string ;
  rus: string ;
  eng: string ;
  calculate: string ;
  light: string ;
  dark: string ;
  system: string ;
  main: string;
  projectname: string ;
  partner: string;
  project_desc: string ;
  project_losing: string;
  about: string ;
  about_desc: string ;
  team: string ;
  team_desc: string ;
  howatwork: string ;
  howatwork_desc: string ;
  stake: string ;
  stake_desc: string ;
  invest: string ;
  invest_desc: string;
  usdtortoken:string;
  apy_value: string;
  project_losing_get: string;
  footerMadeWith: string;
  footerBy: string;
  githubButton: string;
  contractButton: string;
  testnetBanner: string;
  telegramButton: string;
  [key: string]: string;
}


export const en : ILang ={
  lang:'English',
  rus: 'Russian',
  eng: 'English',
  calculate: "Calculator",
  light: 'Light',
  dark: 'Dark',
  system: 'System',
  main: 'Main',
  projectname: 'ton\/nvest',
  partner: 'TON',
  project_desc: 'description',
  project_losing: 'invest safety!',
  about: "About us",
  about_desc: 'About description',
  team: 'Team',
  team_desc: 'team description',
  howatwork: 'How at Work',
  howatwork_desc: 'description',
  stake: "Stake",
  stake_desc: 'description',
  invest: 'Investing',
  invest_desc: 'description',
  apy: 'APY to',
  apy_value: '300%',
  project_losing_get: 'income',
  usdtortoken: 'RUBT or TIN',
  wallet: 'Wallet',
  logout: 'Log out',
  youChoiceNotify: 'You have choice ',
  youChoiceNotifyErr: 'You have already chosen ',
  slogan: 'Try your luck by tossing a ',
  slogan_coin: 'coin!',
  slogan_text_size: '',
  choice_side: 'Choose a side',
  choice_side_class: 'text-4xl text-nowrap',
  bet: 'Bet sum',
  betchange: 'Bet change to ',
  beterrchange: 'Bet has been choose',
  maxbeterr: 'This bet is temporarily unavailable',
  flipBtn: 'Lets flip coin!',
  historyTitle: 'History game',
  allgamesbtn: 'All games',
  canwin: 'You can',
  winBig: 'win',
  canwinClass: 'text-[45px] leading-[55px]',
  winBigClass: 'text-[90px]',
  x2: 'and x2',
  betBig: 'bet',
  x2Class: 'text-[40px] leading-[55px]',
  betBigClass: 'text-[80px]',
  choselang: 'Chose language',
  themechose: 'Chose theme',
  connectWallet: 'Connect TON wallet',
  bet1:'TON',
  bet2:'NOT',
  balance: '',
  win: 'Win',
  lost: 'Lost',
  winAmountPrefix: 'Win amount',
  betPrefix: 'Your bet',
  continueBtnFromResult: 'Close result',
  onPrefix: 'on',
  transactionProcessing: 'Processing transaction...',
  transactionSending: 'Sending...',
  noGamesYet: 'No games yet',
  fullHistoryTitle: 'Full game history',
  back: 'Back',
  clearHistory: 'Clear history',
  clearHistoryConfirm: 'Are you sure you want to clear game history?',
  totalGames: 'Total games',
  wins: 'Wins',
  losses: 'Losses',
  totalWon: 'Total won',
  goToGame: 'Go to game',
  justNow: 'Just now',
  minutesAgo: 'min. ago',
  hoursAgo: 'h. ago',
  daysAgo: 'days ago',
  footerMadeWith: 'Made with',
  footerBy: 'by',
  githubButton: 'GitHub',
  contractButton: 'Contract',
  testnetBanner: 'TESTNET version of the site',
  telegramButton: 'Telegram author',
};

export const ru: ILang ={
  lang:'Russian',
  rus: 'Russian',
  eng: 'English',
  calculate: "Калькулятор",
  light: 'Светлая',
  dark: 'Темная',
  system: 'Системная',
  main: 'Главная',
  projectname: 'ton\/nvest',
  partner: 'TON',
  project_desc: 'описание',
  project_losing: 'инвестируй безопасно!',
  about: "О нас",
  about_desc: 'About описание',
  team: 'Команда',
  team_desc: 'team описание',
  howatwork: 'Как это работает?',
  howatwork_desc: 'описание',
  stake: "Стейкинг",
  stake_desc: 'описание',
  invest: 'Инвестиции',
  invest_desc: 'описание',
  apy: 'APY до',
  apy_value: '300%',
  project_losing_get: 'доход в',
  usdtortoken: 'RUBT или TIN',
  wallet: 'Кошелек',
  logout: 'Выход',
  youChoiceNotify: 'Вы успешно выбрали ',
  youChoiceNotifyErr: 'Вы уже выбрали ',
  slogan: 'Используй удачу в подбрасывании',
  slogan_coin: 'монеты!',
  slogan_text_size: 'rus',
  choice_side: 'Выбери сторону',
  choice_side_class: 'text-3xl text-nowrap',
  bet: 'Ставка',
  betchange: 'Ставка изменена на ',
  beterrchange: 'Ставка уже выбрана',
  maxbeterr: 'Данная ставка временно невозможна',
  flipBtn: 'Подбросить монету!',
  historyTitle: 'История игр',
  allgamesbtn: 'Все игры',
  canwin: 'Ты можешь',
  winBig: 'выиграть',
  canwinClass: 'text-[45px] leading-[60px]',
  winBigClass: 'text-[55px] leading-[20px]',
  x2: 'и удвоить',
  betBig: 'ставку',
  x2Class: 'text-[40px] leading-[60px]',
  betBigClass: 'text-[55px] leading-[20px]',
  choselang: 'Выбери язык',
  themechose: 'Выбери тему',
  connectWallet: 'Подключить кошелек TON',
  bet1:'TON',
  bet2:'NOT',
  balance: '',
  win: 'Выиграл',
  lost: 'Проиграл',
  winAmountPrefix: 'Выигрыш',
  betPrefix: 'Ваша ставка',
  continueBtnFromResult: 'Закрыть результат',
  onPrefix: 'на',
  transactionProcessing: 'Обработка транзакции...',
  transactionSending: 'Отправляем...',
  noGamesYet: 'История игр пуста',
  fullHistoryTitle: 'Полная история игр',
  back: 'Назад',
  clearHistory: 'Очистить историю',
  clearHistoryConfirm: 'Вы уверены, что хотите очистить историю игр?',
  totalGames: 'Всего игр',
  wins: 'Побед',
  losses: 'Поражений',
  totalWon: 'Выиграно',
  goToGame: 'Перейти к игре',
  justNow: 'Только что',
  minutesAgo: 'мин. назад',
  hoursAgo: 'ч. назад',
  daysAgo: 'дн. назад',
  footerMadeWith: 'Сделанно с',
  footerBy: 'by',
  githubButton: 'GitHub',
  contractButton: 'Смартконтракт',
  testnetBanner: 'Версия сайта для TESTNET',
  telegramButton: 'Телеграм автора',
};