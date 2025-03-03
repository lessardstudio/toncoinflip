# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default tseslint.config({
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

- Replace `tseslint.configs.recommended` to `tseslint.configs.recommendedTypeChecked` or `tseslint.configs.strictTypeChecked`
- Optionally add `...tseslint.configs.stylisticTypeChecked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and update the config:

```js
// eslint.config.js
import react from 'eslint-plugin-react'

export default tseslint.config({
  // Set the react version
  settings: { react: { version: '18.3' } },
  plugins: {
    // Add the react plugin
    react,
  },
  rules: {
    // other rules...
    // Enable its recommended rules
    ...react.configs.recommended.rules,
    ...react.configs['jsx-runtime'].rules,
  },
})
```

## Деплой в Vercel

Проект настроен для деплоя в Vercel. Для деплоя выполните следующие шаги:

1. Создайте аккаунт на [Vercel](https://vercel.com) если у вас его еще нет
2. Установите Vercel CLI:
   ```bash
   npm install -g vercel
   ```
3. Войдите в аккаунт Vercel:
   ```bash
   vercel login
   ```
4. Выполните деплой из корневой директории проекта:
   ```bash
   vercel
   ```
5. Следуйте инструкциям в командной строке для завершения деплоя

Альтернативно, вы можете выполнить деплой через GitHub:

1. Загрузите проект в репозиторий GitHub
2. Войдите в аккаунт Vercel и создайте новый проект
3. Выберите ваш репозиторий GitHub
4. Настройте следующие параметры:
   - Framework Preset: Vite
   - Build Command: `yarn build`
   - Output Directory: `dist`
5. Добавьте переменные окружения из файла `.env.production`
6. Нажмите "Deploy"

### Переменные окружения для Vercel

Убедитесь, что в Vercel настроены следующие переменные окружения:

- `VITE_CONTRACT_ADDRESS` - адрес смарт-контракта
- `VITE_TON_NETWORK` - сеть TON (testnet/mainnet)
- `VITE_IS_TESTNET` - флаг тестовой сети (true/false)
- `VITE_TONCENTER_API_KEY` - API ключ для toncenter.com
- `VITE_DEBUG` - режим отладки (true/false)
- `VITE_TONWEB_VERSION` - версия TonWeb
- `VITE_TONWEB_TIMEOUT` - таймаут инициализации TonWeb
