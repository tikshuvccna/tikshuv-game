# פרומפטים ליצירת תמונות וסרטונים

המשחק **עובד במלואו גם בלי אף קובץ מכאן**, כי הכול מצויר בקוד. הנכסים האלה הם בונוס שהופך אותו לעוד יותר קולנועי.
כל קובץ שתעלה לגיט בשם ובנתיב המדויקים שמופיעים בטבלה יזוהה אוטומטית, בלי שום שינוי קוד.

| קובץ | נתיב | מה קורה בו במשחק |
|---|---|---|
| רקע לכל אזור (7 קבצים) | `assets/backgrounds/<zone>.jpg` | מופיע כשמיים מאחורי קו הבניינים. כשהאזור "כבוי" הוא עמום, וכשמתקנים אותו הוא נדלק |
| סרטון פתיחה | `assets/video/intro.mp4` | מתנגן אחרי בחירת הדמות, לפני הכניסה לעולם (עם כפתור דילוג) |
| סרטון סיום | `assets/video/finale.mp4` | מתנגן אחרי הניצחון, לפני סיור הבנייה והתעודה |
| לוגו | `assets/img/logo.png` | במסך הפתיחה ובתעודה |

שמות הרקעים (`<zone>`): `portal`, `square`, `train`, `mall`, `hospital`, `ai`, `core`.

## מפרט טכני

- **רקעים:** JPG, יחס 16:9, רזולוציה 1920×1080, עד ~400KB לקובץ (כדאי לדחוס ב-squoosh.app או tinypng.com).
- **סרטונים:** MP4 (H.264), 1280×720 או 1920×1080, עד 15 שניות, עד ~8MB, ללא סאונד או עם סאונד עדין (המשחק מנגן מוזיקה משלו).
- **לוגו:** PNG שקוף, גובה 300px.
- **בלי טקסט בתוך התמונות/הסרטונים** (מודלים של AI מקלקלים עברית), כי הטקסטים מגיעים מהמשחק.
- **בלי אנשים בפריים** (הדמות של התלמיד היא שהולכת בעולם).

## סגנון אחיד (הדבק/י בתחילת כל פרומפט לתמונה, כדי שכל האזורים ייראו כמו עולם אחד)

```
Style: optimistic neon cyberpunk city called "Netopolis", night time, glowing magenta / cyan / violet neon,
volumetric light, soft fog, subtle film grain, clean vector-like shapes mixed with painterly depth,
wide cinematic composition, horizon around 70% of the frame height, empty walkable street at the bottom,
NO text, NO letters, NO logos, NO people, 16:9, ultra detailed, high quality concept art.
```

## תמונות רקע (7)

הוסף/י את כל אחד מהפרומפטים אחרי בלוק הסגנון.

### 1. `portal.jpg`: שער הכניסה
```
A giant vertical holographic portal ring made of flowing blue binary data at the edge of a glowing digital plaza,
floor covered with a luminous perspective grid, distant skyline of the city Netopolis under a violet-blue night sky,
floating data particles rising, a huge translucent wireframe globe with connection arcs in the sky.
Color palette: cyan, deep blue, a touch of magenta.
```

### 2. `square.jpg`: כיכר הרשת
```
A grand public plaza whose centerpiece is a tall lattice router tower emitting concentric Wi-Fi rings,
floating holographic envelopes and message bubbles drifting between buildings, a cozy neon cafe with a striped awning,
overhead cables strung between poles with glowing data packets travelling along them.
Color palette: magenta and purple with warm yellow window light.
```

### 3. `train.jpg`: תחנת הרכבת החכמה
```
A futuristic smart train station at dusk, sleek white maglev train with orange accent stripe, a large holographic
departure board without readable text, fiber-optic cables and networking cabinets with blinking LEDs along the platform,
sunset-orange sky blending into violet.
Color palette: orange, amber, teal accents.
```

### 4. `mall.jpg`: המרכז המסחרי והבנק
```
A vibrant neon shopping district with glass storefronts and a classical columned bank building with a holographic
padlock and shield hovering above the street, payment terminals glowing, floating digital coins and shield icons.
Color palette: hot pink, violet, electric blue.
```

### 5. `hospital.jpg`: בית החולים
```
A modern hospital tower with a glowing green cross, a translucent hexagonal energy dome (firewall) protecting it,
a large heartbeat monitor hologram, a small medical drone flying between buildings, server cabinets in the foreground.
Color palette: emerald green, mint, teal, clean white light.
```

### 6. `ai.jpg`: מעבדת הבינה המלאכותית
```
A glass dome AI research lab with a glowing neural network visible inside, a giant friendly holographic robot head
with cyan eyes floating above the plaza, small delivery robots on wheels, floating node-and-edge graph structures
pulsing with light.
Color palette: violet, electric purple, cyan highlights.
```

### 7. `core.jpg`: ליבת העיר
```
A colossal server hall: endless towers of server racks with blinking LEDs converging on a glowing cylindrical
glass pillar containing a radiant energy core, thick cables converging along the floor, light beams shooting up into the sky,
a huge vault-like door at the far end.
Color palette: electric cyan and deep navy with white-hot core light.
```

## סרטונים

### `intro.mp4` (8-12 שניות): כניסה לעולם החדש
```
Cinematic first-person camera moving through a dark server room lined with glowing racks. Streams of blue binary
digits flow along the cables and converge in front of the camera, forming a giant swirling circular portal.
The camera pushes forward through the portal, light flares, and emerges above a vast neon city at night
(Netopolis) with a glowing globe in the sky and light trails of data flowing between the buildings.
Smooth camera motion, cinematic lighting, cyan / magenta neon, no text, no people, 16:9, 24fps.
```

### `finale.mp4` (6-10 שניות): העיר חוזרת לחיים
```
Wide aerial shot of a dark city at night. From a central glowing tower a wave of light spreads outward:
building windows light up in cyan, magenta and gold, neon signs flicker on, light trails of data packets race
along cables and rails, drones lift off, a holographic globe ignites in the sky. Fireworks made of light particles.
Cinematic, uplifting, smooth camera pull-back, no text, no people, 16:9, 24fps.
```

## לוגו

יש לך כנראה כבר לוגו של בית הספר או של המגמה: העלה/י אותו כ-`assets/img/logo.png`. אם אין:
```
Minimal flat vector logo icon: a stylized hexagon made of connected network nodes forming a shield with a subtle Wi-Fi
arc inside, gradient from cyan to violet, on a fully transparent background, centered, no text.
```

## טיפ להתאמה
- אחרי שתעלה רקעים, אם תמונה "חזקה" מדי על הבניינים אפשר להחליש אותה: בקובץ `js/world.js` חפש `0.35 + 0.5 * world.lit` ושנה את המספרים.
- שינוי הטקסטים, השם והקישור למגמה: `js/config.js` ו-`js/content.js`.
