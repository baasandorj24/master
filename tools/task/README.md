# task — локал таск менежментийн CLI

Интернэт, сервер, бүртгэл шаардахгүй. Бүх өгөгдөл таны компьютер дээрх
ганц JSON файлд хадгалагдана. Python 3.8+ байхад л хангалттай — гуравдагч
сан суулгах шаардлагагүй.

```
tools/task/
├── task          # bash wrapper (PATH-д холбоход зориулсан)
├── task.py       # үндсэн програм (CLI)
├── web.py        # локал вэб сервер + JSON API
├── webui/        # вэб интерфэйсийн HTML/CSS/JS
├── test_task.py  # CLI-ийн тестүүд
├── test_web.py   # вэб серверийн тестүүд
└── README.md
```

## Суулгах

```bash
chmod +x tools/task/task
ln -s "$PWD/tools/task/task" ~/.local/bin/task   # PATH дотор байх ёстой
task --version
```

Эсвэл шууд ажиллуулж болно:

```bash
python3 tools/task/task.py ls
```

Тохиромжтой бол alias хийнэ:

```bash
echo "alias task='python3 $PWD/tools/task/task.py'" >> ~/.bashrc
```

## Өгөгдлийн файл

Анхдагчаар `~/.tasks.json`. Өөрчлөх бол:

```bash
export TASK_FILE=~/Documents/tasks.json   # орчны хувьсагчаар
task --file ./project-tasks.json ls       # тухайн нэг удаагийн дуудлагад
task path                                 # одоо ямар файл ашиглаж байгааг харах
```

Төслийн лавлах бүрд өөр файл ашиглавал project-тусгай таск жагсаалт үүснэ.
Файл нь энгийн JSON тул git-д commit хийж, Dropbox/Drive-аар синк хийж болно.

## Хэрэглээ

### Таск нэмэх

```bash
task add "Санхүүгийн тайлан бэлдэх" -p urgent -d маргааш -t ажил,тайлан
task add "Номын дэлгүүр орох" -p low -t хувийн -n "Хаяг: Их дэлгүүрийн 3 давхар"
```

| Флаг | Утга |
|------|------|
| `-p, --priority` | `low` / `med` / `high` / `urgent` (эсвэл `бага/дунд/өндөр/яаралтай`, `l/m/h/u`) |
| `-d, --due` | `2026-08-20`, `08-20`, `өнөөдөр`, `маргааш`, `+3d`, `2w`, `5` |
| `-t, --tag` | шошго — таслалаар эсвэл олон удаа өгч болно |
| `-n, --note` | нэмэлт тэмдэглэл |

### Жагсаах, шүүх

```bash
task ls                          # зөвхөн нээлттэй таскууд
task ls -a                       # хаагдсаныг ч оруулаад
task ls --due overdue            # хугацаа хэтэрсэн
task ls --due today              # өнөөдөр дуусах ёстой
task ls --due week --group status
task ls -t ажил -p high
task ls --due none               # хугацаа тавиагүй нь
task ls -l 5                     # эхний 5
task search "тайлан"             # гарчиг, тэмдэглэл, шошгоос хайх
task next -c 3                   # хамгийн чухал 3-ыг санал болгох
```

Эрэмбэ: нээлттэй нь эхэнд → ач холбогдол өндрөөс → хугацаа ойрхоноос.

### Төлөв өөрчлөх

```bash
task start 2       # хийж эхэлсэн  [~]
task done 1 3 5    # дууссан       [x]  (олон ID зэрэг)
task reopen 1      # дахин нээх    [ ]
task cancel 4      # цуцлах        [-]
```

### Засах, устгах

```bash
task edit 1 --title "Шинэ гарчиг" -p high
task edit 1 -d +2w
task edit 1 --clear-due
task edit 1 --add-tag яаралтай --rm-tag дараа
task edit 1 -n "Шинэчилсэн тэмдэглэл"
task show 1                      # дэлгэрэнгүй
task rm 4                        # баталгаажуулалт асууна
task rm 4 5 -y                   # асуухгүй
```

### Тайлан, экспорт

```bash
task stats                       # төлөв, ач холбогдол, хугацаа, шошгын статистик
task export -f md -o TASKS.md    # markdown checklist
task export -f csv -o tasks.csv  # Excel-д нээх
task export -f json -a           # бүрэн нөөцлөлт
task export -f md -t ажил        # шүүлтүүр export дээр ч ажиллана
```

### Импорт, цэвэрлэгээ

```bash
task import backup.json          # давхардсан гарчгийг алгасна
task import backup.json --duplicates
task purge --days 30 --dry-run   # 30 хоногоос хуучин хаагдсаныг харуулах
task purge --days 30             # бодитоор устгах
```

## Монгол нэрсээр дуудах

Дэд командуудыг монголоор бичиж болно:

```
нэм → add        жагсаалт → list    дуусга → done      эхлүүл → start
засах → edit     устга → rm         харах → show       хайх → search
статистик → stats  дараагийн → next  цуцла → cancel    гаргах → export
оруулах → import   цэвэрлэх → purge
```

```bash
task нэм "Уулзалт товлох" -p өндөр -d маргааш
task жагсаалт
task дуусга 1
```

## Ашигтай жишээнүүд

Өглөө бүр өдрийн төлөвлөгөө харах — `~/.bashrc`-д:

```bash
alias өдөр='task ls --due today && task ls --due overdue'
```

Төслийн README-д таск жагсаалтаа автоматаар шинэчлэх:

```bash
task export -f md -o TASKS.md && git add TASKS.md
```

Долоо хоногийн тайлан:

```bash
task ls -a -s done --group priority
```

Вэб самбарыг арын процессоор асааж, ажиллагаагүй бол өөрөө унтраах:

```bash
task web --open --idle-timeout 60 &
```

## Вэб интерфэйс

```bash
task web              # http://127.0.0.1:8787/
task web --open       # хөтчийг автоматаар нээх
task web -P 9000      # өөр порт
```

Хөтчөөс хулганаар удирдана: таск нэмэх, checkbox дарж дуусгах, гарчиг дээр
дарж засах цонх нээх, `▶` товчоор эхлүүлэх, `✕`-ээр устгах. Дээд талд
Нээлттэй / Өнөөдөр / Хоцорсон / 7 хоног / Дууссан / Бүгд гэсэн харагдацууд,
шошгын шүүлтүүр, хайлт байна. Гар товчлуур: `/` — хайлт, `n` — шинэ таск,
`r` — сэргээх, `Esc` — цонх хаах.

CLI болон вэб хоёр яг нэг JSON файл дээр ажилладаг тул терминалд нэмсэн таск
хөтөч дээр (20 секунд тутам эсвэл цонх идэвхжихэд) шууд харагдана.

### Аюулгүй байдал — зөвхөн дотоод хандалт

Сервер нь зөвхөн тухайн компьютерээс хандах зориулалттай. Гаднаас дуудагдахаас
дараах давхаргууд сэргийлнэ:

| Давхарга | Тайлбар |
|----------|---------|
| **Loopback binding** | Зөвхөн `127.0.0.1` / `::1` дээр сонсоно. `--host 0.0.0.0` эсвэл LAN IP өгвөл сервер асахгүй, алдаа заана. Сүлжээний картан дээр порт огт нээгдэхгүй тул LAN/интернэтээс TCP холболт үүсэх боломжгүй. |
| **Peer шалгалт** | Холболтын эх хаяг loopback биш бол 403. |
| **Host толгой** | `Host` нь `127.0.0.1` / `localhost` / `::1` биш бол 403 — DNS rebinding довтолгооноос хамгаална. |
| **CSRF token** | Өгөгдөл өөрчлөх бүх хүсэлт (`POST`/`PATCH`/`DELETE`) процесс бүрт санамсаргүй үүсэх token шаардана. Token нь зөвхөн серверийн өгсөн HTML дотор явдаг. |
| **Origin / Sec-Fetch-Site** | Өөр сайтаас ирсэн хүсэлт 403. CORS толгой хэзээ ч буцаахгүй тул өөр origin хариуг уншиж чадахгүй. |
| **CSP + толгойнууд** | `default-src 'none'`, `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `nosniff`, `no-referrer`, `Cache-Control: no-store`. Гадаад CDN, гадагшаа хүсэлт байхгүй. |
| **Оролтын хязгаар** | Хүсэлтийн бие 64 KiB, гарчиг 500, тэмдэглэл 5000 тэмдэгт, шошго 20. `Content-Type` заавал `application/json`. |
| **Статик файл** | Зөвхөн `app.css`, `app.js` гэсэн тогтмол жагсаалтаас уншина — path traversal боломжгүй. |

Нэмэлт хатууруулалт:

```bash
task web --auth              # санамсаргүй token үүсгэж, URL-д хавсаргана
task web --token МИНИЙ-НУУЦ  # өөрийн token
task web --read-only         # зөвхөн унших — өөрчлөх хүсэлтийг 403-аар татгалзана
task web --idle-timeout 30   # 30 минут ажиллагаагүй бол автоматаар унтрах
```

`--auth` нь нэг компьютерийг хэд хэдэн хүн хуваан хэрэглэдэг (олон
хэрэглэгчтэй сервер, дундын машин) үед хэрэгтэй — token мэдэхгүй бусад локал
хэрэглэгч API-д хандаж чадахгүй.

> **Санамж:** энэ серверийг reverse proxy (nginx, Cloudflare tunnel гэх мэт)-ээр
> гадагш нээх нь дээрх хамгаалалтыг тойрч гарна. Ингэж хэрэглэхээр
> зориулагдаагүй — алсаас хандах шаардлагатай бол SSH port forwarding
> (`ssh -L 8787:127.0.0.1:8787 хэрэглэгч@хост`) ашиглана уу.

### Байнгын ажиллуулах (autostart)

#### macOS — LaunchAgent

```bash
cd ~/master
./tools/task/service/install-macos.sh
```

Энэ нь `~/Library/LaunchAgents/com.task.web.plist` үүсгэж, сервисийг шууд
асаана. Компьютер асаж, та нэвтрэх бүрд өөрөө ажиллана; санамсаргүй
унтарвал launchd 10 секундын дараа дахин асаана.

```bash
./tools/task/service/install-macos.sh status      # төлөв харах
./tools/task/service/install-macos.sh logs        # лог хөтлөх
./tools/task/service/install-macos.sh uninstall   # устгах
./tools/task/service/install-macos.sh print       # plist-ийг зөвхөн хэвлэх

PORT=9000 ./tools/task/service/install-macos.sh              # өөр порт
TASK_FILE=~/Documents/tasks.json ./tools/task/service/install-macos.sh
READ_ONLY=1 ./tools/task/service/install-macos.sh            # зөвхөн унших
```

Лог: `~/Library/Logs/task-web.log`, `~/Library/Logs/task-web.err.log`.

Хөтөчийн хавчуургад `http://127.0.0.1:8787/` гэж хадгалбал хүссэн үедээ
шууд нээнэ. Сервис нь loopback дээр л сонсдог хэвээр — autostart болсноор
гаднаас хандах эрсдэл нэмэгдэхгүй.

> **Порт нь 1024-өөс дээш байх ёстой.** 80, 88, 443 гэх мэт privileged портыг
> зөвхөн root эзэмшинэ; LaunchAgent нь таны нэрийн доор ажилладаг тул холбогдож
> чадалгүй, KeepAlive-тай хамт байнга дахин эхэлнэ. Суулгагч скрипт үүнийг
> урьдчилан шалгаж, алдаа заана. 88-ын оронд 8088 гэх мэтийг ашиглана уу.

> `--idle-timeout`-ыг launchd-тэй хамт бүү ашигла: сервис унтармагц launchd
> дахин асааж, тасралтгүй давтагдана.

#### Linux — systemd (хэрэглэгчийн unit)

```bash
mkdir -p ~/.config/systemd/user
sed "s|__REPO__|$HOME/master|" tools/task/service/task-web.service \
    > ~/.config/systemd/user/task-web.service
systemctl --user daemon-reload
systemctl --user enable --now task-web
journalctl --user -u task-web -f
```

#### Хамгийн энгийн (түр зуурын)

```bash
nohup task web >~/task-web.log 2>&1 &
```

Терминал хаагдахад үлдэнэ, гэхдээ компьютер унтарч асахад дахин ажиллахгүй.

### JSON API

Бүх хариу JSON. Өөрчлөлт хийсний дараа шинэчилсэн бүтэн төлөвийг буцаана.

| Метод | Хаяг | Тайлбар |
|-------|------|---------|
| `GET` | `/api/state?view=open&q=&tag=` | таскууд, тоолуур, шошго |
| `POST` | `/api/tasks` | шинээр үүсгэх |
| `PATCH` | `/api/tasks/{id}` | талбар засах, төлөв солих |
| `DELETE` | `/api/tasks/{id}` | устгах |
| `GET` | `/api/export?format=md\|csv\|json` | татаж авах |

`view` утгууд: `open`, `today`, `overdue`, `week`, `done`, `all`.

## Тест ажиллуулах

```bash
python3 -m unittest discover -s tools/task -p 'test_*.py'
```

CLI-ийн 49, вэб серверийн 46 тест — нийт 95. Вэб тестүүд аюулгүй байдлын
шалгалт бүрийг (Host, Origin, CSRF, token, read-only, биеийн хэмжээ,
loopback биш хаяг дээр асаахаас татгалзах) тусад нь шалгадаг.

## Техникийн тэмдэглэл

- **Атомик бичилт** — түр файлд бичээд `os.replace`-ээр солино. Бичих явцад
  програм тасарсан ч хуучин өгөгдөл эвдрэхгүй.
- **ID дахин ашиглагдахгүй** — `next_id` тоолуур файлд хадгалагдана.
  Устгасан ID-г шинэ таск авахгүй тул хуучин тэмдэглэл будлихгүй.
- **Өнгө** — терминал биш үед (pipe, файл руу бичих) автоматаар унтарна.
  `NO_COLOR=1` эсвэл `--no-color` флагаар албадан унтраана.
- **Exit code** — амжилттай бол `0`, алдаа гарвал `1`, Ctrl+C дарвал `130`.
  Скриптэд ашиглахад тохиромжтой.

## Өгөгдлийн бүтэц

```json
{
  "version": 1,
  "next_id": 5,
  "tasks": [
    {
      "id": 1,
      "title": "Санхүүгийн тайлан бэлдэх",
      "status": "todo",
      "priority": "urgent",
      "tags": ["ажил", "тайлан"],
      "due": "2026-08-12",
      "note": "",
      "created": "2026-08-11T09:14:02",
      "updated": "2026-08-11T09:14:02",
      "done_at": null
    }
  ]
}
```
