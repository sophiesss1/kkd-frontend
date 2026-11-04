# syntax=docker/dockerfile:1
# Mock API из репозитория задания, шаги сборки — как в его собственном Dockerfile.
# Код забирается через ADD по адресу git, а не через build.context с адресом:
# Docker Compose 5 на Windows передаёт такой контекст сборщику как путь к папке и падает
# с «failed to execute bake».
# Коммит зафиксирован (голова master на 03.11.2026): с веткой новая версия mock API могла бы изменить
# данные, и числа в README, критериях приёмки и снимке для тестов разошлись бы с живым API.
FROM python:3.12-slim
WORKDIR /srv
ADD https://gitverse.ru/kkk_s/moc_api_kkd.git#e6a7431957a113e96ae8ebf3f8fae171490ea0d4 /srv
RUN pip install --no-cache-dir -r requirements.txt
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
