# task — локал таск менежментийн CLI

Интернэт, сервер, бүртгэл шаардахгүй. Бүх өгөгдөл таны компьютер дээрх
ганц JSON файлд хадгалагдана. Python 3.8+ байхад л хангалттай — гуравдагч
сан суулгах шаардлагагүй.

```
tools/task/
├── task          # bash wrapper (PATH-д холбоход зориулсан)
├── task.py       # үндсэн програм
├── test_task.py  # 49 тест
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

## Тест ажиллуулах

```bash
python3 -m unittest discover -s tools/task -p 'test_*.py'
```

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
