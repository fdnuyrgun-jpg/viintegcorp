# VIntegCorp

Система управления предприятием.

## Стек технологий

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase

## Разработка

```sh
npm i
cp .env.example .env  # Настройте переменные окружения
npm run dev
```

## Сборка для продакшена

```sh
npm run build
```

Артефакты будут в папке `dist/`. Разверните её на любом статическом хостинге.

**SPA-роутинг:** в проекте есть `vercel.json` (Vercel) и `public/_redirects` (Netlify) для корректной работы client-side маршрутизации.

**Важно:** Перед деплоем задайте переменные окружения:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

## Предпросмотр продакшен-сборки

```sh
npm run preview
```
