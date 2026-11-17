# SWIT4 Backend API v1

Типы — `src/services/api/contracts.ts`. Базовый URL задаётся `VITE_API_BASE_URL`; без него используется DEMO mock.

| Метод | Путь | Описание |
|---|---|---|
| GET | /api/v1/servers | Нормализованные серверы (`?country&protocol&cursor`) |
| GET | /api/v1/countries | Справочник стран |
| GET | /api/v1/subscriptions | Подписки пользователя |
| POST | /api/v1/subscriptions | `{ name, url, refreshIntervalMin? }` |
| PATCH | /api/v1/subscriptions/{id} | name, url, enabled, refreshIntervalMin |
| DELETE | /api/v1/subscriptions/{id} | Удаление |
| POST | /api/v1/subscriptions/{id}/refresh | `{ added, removed, total }` |
| POST | /api/v1/scans | `{ serverIds, options }` → `{ id }` |
| GET | /api/v1/scans/{id} | Прогресс `ScanProgress` |
| GET | /api/v1/scans/{id}/results | Результаты |
| GET | /api/v1/app/version | Версия, changelog |
| GET | /api/v1/health | Статус воркеров |

Ошибки: `{ code: NETWORK|TIMEOUT|RATE_LIMITED|NOT_FOUND|VALIDATION|SSRF_BLOCKED|TOO_LARGE|SERVER|UNAVAILABLE, message, retryAfterSec? }`.

## Обязанности backend
Планировщик обновлений, парсинг, нормализация, дедупликация, контролируемые проверки (только адреса из пользовательских источников), кеширование (ETag/Last-Modified), журнал ошибок.

## Защита
HTTPS, валидация входа, rate limiting, SSRF-защита (запрет частных/loopback/link-local адресов, проверка после DNS-резолва и редиректов), лимит размера ответа (5 МБ), отсутствие секретов в bundle и логах. Правила маршрутизации и список приложений на backend не передаются.
