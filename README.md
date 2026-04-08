# Workout Counter React

Веб-приложение для подсчета повторений по веб-камере с помощью MediaPipe Pose.

## Что умеет сейчас

- Рисует видео и скелет позы в одном `canvas` (без вывода камеры в видимый `video`).
- Считает повторения для:
  - подъема на бицепс;
  - приседаний.
- Показывает фазы упражнения, confidence и диагностические метрики углов.

## Запуск

```bash
npm install
npm run dev
```

Откройте URL из Vite в браузере и разрешите доступ к камере.

## Скрипты

- `npm run dev` - локальная разработка.
- `npm run build` - production build.
- `npm run lint` - ESLint.
- `npm run test` - unit-тесты детекторов.

## Архитектура

- `src/camera` - запуск/остановка камеры.
- `src/pose` - MediaPipe Pose landmarker, нормализация и сглаживание landmarks.
- `src/exercises` - детекторы упражнений и реестр.
- `src/render` - canvas-рендер видео, скелета и HUD.
- `src/app` - orchestration хук, объединяющий камеру, модель и детектор.

## Как добавить новое упражнение

1. Создайте файл `src/exercises/<newExercise>.ts`.
2. Реализуйте интерфейс `ExerciseDetector`:
   - `id`, `name`, `description`;
   - `createState()`;
   - `update(landmarks, state)`.
3. Добавьте детектор в `src/exercises/registry.ts`.
4. Новое упражнение автоматически появится в выпадающем списке.

## Примечания

- Для работы MediaPipe используется модель `pose_landmarker_lite`.
- Пороговые значения углов находятся прямо в файлах детекторов и легко настраиваются.
