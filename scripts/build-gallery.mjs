// Generates the gallery body (sections 02–05) into gallery.html between the @gallery markers.
//   node scripts/build-gallery.mjs
// Image dimensions come from assets/images/dimensions.json (node scripts/image-dims.mjs --write); every image
// must exist in scripts/images-manifest.mjs (i.e. be licence-verified) or the build fails.
import fs from 'node:fs';
import { IMAGES } from './images-manifest.mjs';

const DIM = JSON.parse(fs.readFileSync('assets/images/dimensions.json', 'utf8'));
const VERIFIED = new Set(IMAGES.map((i) => i[0]));
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const used = [];

const img = (file, alt, { cls = '', eager = false } = {}) => {
  if (!VERIFIED.has(file)) throw new Error(`Image "${file}" is not in the verified manifest`);
  if (!DIM[file]) throw new Error(`No dimensions for "${file}" (run node scripts/image-dims.mjs --write)`);
  used.push(file);
  const [w, h] = DIM[file];
  return `<img src="./assets/images/${file}.jpg" alt="${esc(alt)}" width="${w}" height="${h}" loading="${eager ? 'eager' : 'lazy'}" decoding="async"${cls ? ` class="${cls}"` : ''}>`;
};

/* ============================ 02/03  THE ARCHIVE (filterable, balanced grid) ============================ */
const CATS = {
  projects: 'Student Projects',
  illustration: 'Fashion Illustrations',
  construction: 'Garment Construction',
  textile: 'Textile & Fabric',
  studio: 'Studio Activities',
  showcase: 'Showcases & Runway',
};
const ARCHIVE = {
  projects: [
    ['creation-maroon-dress', 'Maroon one-shoulder gown', 'Models in maroon and red gowns walking a runway'],
    ['process-finished-dress', 'Satin gown, long glove', 'A model in a finished satin gown, sunglasses and a long black glove'],
    ['showcase-long-coat', 'Long coat silhouette', 'A long camel coat styled against a plain wall'],
    ['archive-white-dress', 'White jacket, floral appliqués', 'A model in a white tailored jacket with floral appliqués, in black and white'],
  ],
  illustration: [
    ['sketch-yellow-dress', 'Yellow dress sketch', 'A fashion sketch of a woman in a yellow dress'],
    ['archive-gown-sketch', 'Strapless gown, floral appliqués', 'A fashion sketch of a strapless gown with floral appliqués'],
    ['journey-sketch-coat', 'Coat and skirt sketch', 'A fashion sketch of a woman in a coat and skirt'],
    ['showcase-sketch-pattern', 'Patterned dress sketch', 'A fashion sketch of a woman in a patterned dress'],
  ],
  construction: [
    ['sewing-machine-yellow', 'Vintage machine', 'A vintage black and yellow sewing machine'],
    ['process-dress-form', 'Fitting on the form', 'Designers fitting a garment on a dress form'],
    ['sewing-gray-shirt', 'Machine stitching', 'A person stitching fabric under a sewing machine'],
    ['archive-craft-ruler', 'Pattern and ruler', 'Hands drafting a pattern with a ruler on a cutting mat'],
  ],
  textile: [
    ['archive-textile-wavy', 'Marbled colour study', 'Marbled textile art in red, yellow and blue'],
    ['showcase-textile-geometric', 'Geometric textile art', 'Textile artwork with colourful geometric patterns'],
    ['fabric-red-striped', 'Striped weave', 'Striped woven fabric in red, blue and neutral tones'],
    ['journey-textile-pile', 'Fabric stack', 'A stack of folded multi-coloured textiles'],
  ],
  studio: [
    ['journey-concept-paper', 'Concept on paper', 'Working on a large sheet of paper with scissors and tools'],
    ['showcase-collab-desk', 'Collaborating on a design', 'Two women collaborating over design materials at a desk'],
    ['why-sketching-studio', 'Sketching at the desk', 'A designer sketching at her desk in a bright studio'],
  ],
  showcase: [
    ['runway-red-coat', 'Red coat, patterned trousers', 'A model in a long red coat and patterned trousers on the runway'],
    ['runway-floral', 'Sheer floral dress', 'A model in a sheer lavender floral dress under stage lights'],
    ['runway-pink-gown', 'Pink feathered gown', 'A pink feathered gown on a model walking the runway'],
    ['journey-runway-red', 'Red dress, runway walk', 'A model in a red dress walking the runway'],
  ],
};
// Round-robin so "All" mixes categories instead of grouping them.
const archiveOrder = [];
for (let i = 0; i < 4; i++) for (const c of Object.keys(CATS)) if (ARCHIVE[c][i]) archiveOrder.push([c, ...ARCHIVE[c][i]]);
const archiveCount = archiveOrder.length;

const archiveItem = ([cat, file, title, alt]) => {
  const [w, h] = DIM[file];
  return `          <figure class="g-item" data-lb data-lb-group="archive" data-cat="${cat}" data-title="${esc(title)}" data-ar="${(w / h).toFixed(3)}"><button type="button" class="g-open" aria-label="View larger: ${esc(title)}">${img(file, alt)}</button><figcaption class="g-cap"><small>${esc(CATS[cat])}</small><span>${esc(title)}</span></figcaption></figure>`;
};

const chips = [['all', 'All', archiveCount], ...Object.entries(CATS).map(([k, v]) => [k, v, ARCHIVE[k].length])]
  .map(([k, label, n], i) => `            <li><button type="button" class="g-chip" data-filter="${k}" aria-pressed="${i === 0}">${esc(label)} <span class="c">${n}</span></button></li>`).join('\n');

const sec2 = `
    <!-- ===================================================================== -->
    <!-- 02 THE ARCHIVE – introduction + category filter                       -->
    <!-- ===================================================================== -->
    <section class="section bg-surface !pb-10 lg:!pb-12" aria-labelledby="intro-title">
      <div class="atelier-container">
        <div class="head-split">
          <div>
            <span class="eyebrow">The Archive</span>
            <h2 id="intro-title" class="h-section">Work, process <em>and performance.</em></h2>
          </div>
          <p class="lead max-w-md">Browse by category, or open any image to view it larger.</p>
        </div>
        <div class="mt-12" role="group" aria-label="Filter the archive by category">
          <ul class="g-filters" id="g-filters">
${chips}
          </ul>
          <p class="g-status" id="g-status" role="status" aria-live="polite">Showing all ${archiveCount} images.</p>
        </div>
        <p class="mt-6 max-w-2xl text-xs leading-relaxed text-ink-muted" data-placeholder="gallery-imagery">Imagery is licensed editorial photography used to illustrate each category. It is not presented as the work of identified ATELIER ÉLAN students.</p>
      </div>
    </section>`;

const sec3 = `
    <!-- ===================================================================== -->
    <!-- 03 STUDENT CREATIONS – balanced justified grid (layout computed by gallery.js) -->
    <!-- ===================================================================== -->
    <section class="section !pt-2 bg-surface" aria-labelledby="creations-title" data-g-section="archive">
      <div class="atelier-container">
        <div class="head-split mb-10">
          <div>
            <span class="eyebrow">Student Creations</span>
            <h2 id="creations-title" class="h-section">Made in <em>the studio.</em></h2>
          </div>
          <p class="lead max-w-md">Garments, drawings, cloth and the rooms they come from.</p>
        </div>
        <div class="g-justified" id="g-grid" data-g-grid>
${archiveOrder.map(archiveItem).join('\n')}
        </div>
        <div class="g-empty" data-empty="archive" role="status">
          <p>No pieces in this category yet.</p>
          <button type="button" class="link-arrow" data-filter-reset>Show all images</button>
        </div>
      </div>
    </section>`;

/* ============================ 04  BEHIND THE STUDIO (production journey, dark) ============================ */
const plate = (group, file, alt, title, label, { frame = 'aspect-[16/9]', cls = '', imgCls = '' } = {}) => `<figure class="plate ${cls}" data-lb data-lb-group="${group}" data-title="${esc(title)}"><button type="button" class="g-open" aria-label="View larger: ${esc(title)}"><span class="frame ${frame}">${img(file, alt, { cls: imgCls })}</span></button><figcaption class="plate__cap"><small>${esc(label)}</small><span>${esc(title)}</span></figcaption></figure>`;

const stage = (n, name, text, mediaHtml, flip) => `
          <li class="stage${flip ? ' stage--flip' : ''}">
            <div class="stage__bar"><span class="stage__no" aria-hidden="true">${String(n).padStart(2, '0')}</span><h3 class="stage__name">${name}</h3><span class="stage__rule" aria-hidden="true"></span></div>
            <div class="stage__body">
              <div class="stage__text"><p>${text}</p></div>
              <div class="stage__media">${mediaHtml}</div>
            </div>
          </li>`;

const G = 'studio';
const sec4 = `
    <!-- ===================================================================== -->
    <!-- 04 BEHIND THE STUDIO – the production journey, concept to finished garment -->
    <!-- ===================================================================== -->
    <section class="section on-dark bg-charcoal text-warm-ivory" aria-labelledby="studio-title" data-g-section="studio">
      <div class="atelier-container">
        <div class="head-split mb-12">
          <div>
            <span class="eyebrow eyebrow--light">Behind the Studio</span>
            <h2 id="studio-title" class="h-section">From first sketch <em>to finished garment.</em></h2>
          </div>
          <p class="lead max-w-md">Six stages, documented where they happen: the desk, the cutting table, the sewing room and the fitting.</p>
        </div>

        <ol class="journey">${[
  stage(1, 'Concept &amp; Sketching', 'Every garment begins on paper. Mood, silhouette and proportion are worked out in sketchbooks long before any cloth is cut.',
    `<div class="m m--concept">${plate(G, 'studio-sketching-paper', 'A designer sketching a garment on paper at a studio table', 'Sketching a garment at the studio table', 'Plate 1.1', { cls: 'm__a' })}${plate(G, 'studio-sketch-garment', 'A designer drawing lines on a garment sketch', 'Refining lines on the design sheet', 'Plate 1.2', { cls: 'm__b' })}</div>`, false),
  stage(2, 'Fabric &amp; Textile Exploration', 'Cloth decides what a design can become. Students handle, test and compare weaves, weights and finishes before they commit.',
    `<div class="m m--fabric">${plate(G, 'fabric-material-samples', 'Fabric and material samples arranged on a surface', 'Material samples laid out for selection', 'Plate 2.1', { frame: 'aspect-[4/5]', cls: 'm__a' })}${plate(G, 'fabric-textures', 'Close-up of assorted textile textures and finishes', 'Texture and finish, up close', 'Plate 2.2', { frame: 'aspect-[3/2]', cls: 'm__b' })}${plate(G, 'fabric-blue-grey', 'Folded blue and grey wool fabrics', 'Folded wools and suitings', 'Plate 2.3', { frame: 'aspect-[3/2]', cls: 'm__c' })}</div>`, true),
  stage(3, 'Pattern Making &amp; Cutting', 'The drawing becomes flat pattern pieces, cut with care. Precision at this stage saves every stage after it.',
    `<div class="m m--cut">${plate(G, 'sewing-craft-knife', 'Hands cutting red material with a craft knife', 'Cutting with a craft knife', 'Plate 3.1', { frame: 'aspect-[3/2]', cls: 'm__a' })}${plate(G, 'fabric-cloth-table', 'Fabric swatch cards laid out on a table', 'Swatch cards for the cutting table', 'Plate 3.2', { frame: 'aspect-[4/5]', cls: 'm__b' })}</div>`, false),
  stage(4, 'Sewing &amp; Workshop', 'In the sewing room, seams, hems and closures are learned by repetition, with a mentor close at hand.',
    `<div class="m m--sew">${plate(G, 'studio-seamstress', 'A seamstress sewing at her work station', 'At the work station', 'Plate 4.1', { cls: 'm__a' })}${plate(G, 'sewing-machine-grayscale', 'Close-up of a sewing machine needle in black and white', 'The needle, close up', 'Plate 4.2', { frame: 'aspect-[3/2]', cls: 'm__b' })}</div>`, true),
  stage(5, 'Studio Collaboration', 'Critiques, shared tables and second opinions: designers learn as much from one another as from their mentors.',
    `<div class="m m--collab">${plate(G, 'studio-designing-sewing', 'Two designers sewing and reviewing sketches together', 'Designing and sewing side by side', 'Plate 5.1', { cls: 'm__a' })}${plate(G, 'studio-design-room', 'A fashion design studio with sewing materials and dress forms', 'The studio floor', 'Plate 5.2', { cls: 'm__b' })}</div>`, false),
  stage(6, 'Detailing &amp; Final Preparation', 'Trims are set, edges finished and garments pressed. The last details are the ones the audience sees.',
    `<div class="m m--finish">${plate(G, 'sewing-white-red-trim', 'Hands sewing white fabric with red trim', 'Hand-finishing a red trim', 'Plate 6.1', { frame: 'aspect-[4/5]', cls: 'm__a', imgCls: 'object-[50%_30%]' })}${plate(G, 'fabric-white-silk', 'Draped white silk fabric folds', 'Silk, pressed and ready', 'Plate 6.2', { frame: 'aspect-[4/5]', cls: 'm__b' })}</div>`, true),
].join('')}
        </ol>
      </div>
    </section>`;

/* ============================ 05  FASHION SHOWCASE (exhibition rooms, light) ============================ */
const S = 'showcase';
const work = (file, alt, title, label, { frame = 'aspect-[3/4]', cls = '', imgCls = '', blurb = '' } = {}) => `<figure class="work ${cls}" data-lb data-lb-group="${S}" data-title="${esc(title)}"><button type="button" class="g-open" aria-label="View larger: ${esc(title)}"><span class="frame matte ${frame}">${img(file, alt, { cls: imgCls })}</span></button><figcaption class="plaque"><small>${esc(label)}</small><strong>${esc(title)}</strong>${blurb ? `<span>${esc(blurb)}</span>` : ''}</figcaption></figure>`;

const room = (no, title, blurb, inner) => `
        <div class="room">
          <header class="room__head"><span class="room__no" aria-hidden="true">${no}</span><div><h3 class="room__title">${title}</h3><p class="room__blurb">${blurb}</p></div></header>
          ${inner}
        </div>`;

const sec5 = `
    <!-- ===================================================================== -->
    <!-- 05 FASHION SHOWCASE – exhibition rooms: runway, collections, editorial, events -->
    <!-- ===================================================================== -->
    <section class="section bg-surface-alt" aria-labelledby="showcase-title" data-g-section="showcase">
      <div class="atelier-container">
        <div class="head-split mb-12">
          <div>
            <span class="eyebrow">Fashion Showcase</span>
            <h2 id="showcase-title" class="h-section">On the runway <em>and beyond.</em></h2>
          </div>
          <p class="lead max-w-md">An exhibition in four rooms: the runway, the collections, the editorial portrait and the events around them.</p>
        </div>

        <div class="rooms">${[
  room('I', 'Runway Presentations', 'Full-length shows, with lighting, styling and music built around the collection.',
    `<div class="room__grid room__grid--runway">${work('runway-stage-show', 'Models walking a runway stage, seen from above, with the audience seated around it', 'Graduate Runway · Opening Presentation', 'Runway', { frame: 'aspect-[3/2] lg:aspect-auto lg:h-full', cls: 'w-lead', blurb: 'The full cast on the runway, seen from the gallery.' })}${work('runway-black-dress', 'A model in a black tailored dress walking the runway', 'Structured Black', 'Look 03', { frame: 'aspect-[3/4] lg:aspect-auto lg:h-full', cls: 'w-tall', imgCls: 'object-[50%_30%]' })}</div>
     <div class="room__row room__row--4">${work('runway-navy-sheer', 'A model in a navy sheer top and shorts on a red runway', 'Sheer & Navy', 'Look 07', { frame: 'aspect-[4/5]', imgCls: 'object-[50%_25%]' })}${work('runway-white-gown', 'A model in a voluminous white polka-dot gown on a runway', 'White Gown, Full Volume', 'Look 11', { frame: 'aspect-[4/5]', imgCls: 'object-[52%_50%]' })}${work('runway-group-women', 'A group of models walking a runway in pink and red looks', 'Finale Line-up', 'Finale', { frame: 'aspect-[4/5]', imgCls: 'object-[40%_50%]' })}${work('runway-two-models', 'Models walking a runway under stage lights', 'Under the Lights', 'Look 14', { frame: 'aspect-[4/5]', imgCls: 'object-[60%_50%]' })}</div>`),
  room('II', 'Student Collections', 'Capsule collections shown as a body of work: one idea, several silhouettes.',
    `<div class="room__grid room__grid--collections">${work('runway-unique-attire', 'A model walking down the runway in a structured one-piece garment', 'Form & Fold', 'Collection · Structure', { frame: 'aspect-[3/4] lg:aspect-auto lg:h-full', cls: 'c-a', imgCls: 'object-[50%_30%]' })}${work('runway-catwalk-dresses', 'Models in orange and blue draped garments on the catwalk', 'Colour Procession', 'Collection · Drape', { frame: 'aspect-[16/10] lg:aspect-auto lg:h-full', cls: 'c-b' })}${work('runway-shimmering-gowns', 'Two models in shimmering gowns under bright stage lights', 'Evening Light', 'Collection · Evening', { frame: 'aspect-[4/3] lg:aspect-auto lg:h-full', cls: 'c-c' })}<aside class="c-note"><small>Collection note</small><p>Each collection starts as a single idea and is edited down to a handful of looks that belong together.</p></aside></div>`),
  room('III', 'Editorial &amp; Styling', 'Finished garments photographed and styled for the portfolio.',
    `<div class="room__row room__row--4">${work('editorial-blazer-trousers', 'A person in a grey blazer and trousers with a hand in a pocket', 'Tailored Neutrals', 'Portrait', { frame: 'aspect-[3/4]', imgCls: 'object-[50%_30%]' })}${work('editorial-black-blazer-pearls', 'A woman in a black blazer and pearl necklace against a tan wall', 'Black & Pearl', 'Portrait', { frame: 'aspect-[3/4]' })}${work('editorial-grey-trench', 'A woman in a grey trench coat covering her eyes', 'Trench, Reimagined', 'Portrait', { frame: 'aspect-[3/4]' })}${work('editorial-black-net', 'A woman in black net clothing and sunglasses', 'Net & Shadow', 'Portrait', { frame: 'aspect-[3/4]' })}</div>
     <div class="room__row room__row--5">${work('philosophy-red-sky', 'A woman in a red outfit against a clear blue sky', 'Red Against Sky', 'Styling', { frame: 'aspect-square' })}${work('philosophy-suit-sunglasses', 'A woman in a tailored suit and sunglasses sitting on a ledge', 'The Suit, Reframed', 'Styling', { frame: 'aspect-square', imgCls: 'object-[50%_55%]' })}${work('editorial-mirror-sunglasses', 'A woman in sunglasses reflected in a mirror', 'Reflection Study', 'Styling', { frame: 'aspect-square', imgCls: 'object-[50%_30%]' })}${work('editorial-white-top', 'A woman in striped trousers and a white top against a teal backdrop', 'Stripe & Teal', 'Styling', { frame: 'aspect-square', imgCls: 'object-[50%_45%]' })}${work('editorial-grayscale-sleeves', 'A grayscale portrait of a woman in a long-sleeved shirt', 'Wind, in Grey', 'Styling', { frame: 'aspect-square', imgCls: 'object-[50%_25%]' })}</div>`),
  room('IV', 'Events &amp; Exhibitions', 'Shows, openings and the moments around them.',
    `<div class="room__grid room__grid--events">${work('runway-floral-audience', 'A model in a floral dress walking the runway as the audience watches', 'Spring Show · Audience View', 'Event', { frame: 'aspect-[4/3] lg:aspect-auto lg:h-full', cls: 'e-a', imgCls: 'object-[50%_35%]' })}${work('runway-model-walk', 'A model walking the runway in front of the audience', 'The Walk', 'Event', { frame: 'aspect-[3/4] lg:aspect-auto lg:h-full', cls: 'e-b', imgCls: 'object-[50%_30%]' })}${work('event-fashionable-group', 'A group of people in fashionable outfits at a show', 'Backstage Finale', 'Event', { frame: 'aspect-[4/3] lg:aspect-auto lg:h-full', cls: 'e-c' })}${work('event-formal-gathering', 'A woman smiling at a formal gathering with many people', 'Opening Night', 'Exhibition', { frame: 'aspect-[4/3] lg:aspect-auto lg:h-full', cls: 'e-d', imgCls: 'object-[50%_30%]' })}</div>`),
].join('')}
        </div>
      </div>
    </section>`;

/* ============================ write ============================ */
const body = `<!-- @gallery:body:start -->${sec2}\n${sec3}\n${sec4}\n${sec5}\n    <!-- @gallery:body:end -->`;
let html = fs.readFileSync('gallery.html', 'utf8');
if (/<!-- @gallery:body:start -->/.test(html)) html = html.replace(/<!-- @gallery:body:start -->[\s\S]*?<!-- @gallery:body:end -->/, () => body);
else {
  const a = html.indexOf('<!-- ===================================================================== -->\n    <!-- 02 GALLERY INTRODUCTION');
  const b = html.indexOf('<!-- ===================================================================== -->\n    <!-- 06 FINAL CTA');
  if (a < 0 || b < 0) throw new Error('Could not find the section 02–05 boundaries in gallery.html');
  html = html.slice(0, a) + body + '\n\n    ' + html.slice(b);
}
fs.writeFileSync('gallery.html', html);
const dupes = used.filter((f, i) => used.indexOf(f) !== i);
if (dupes.length) { console.error('DUPLICATE images inside the gallery:', [...new Set(dupes)].join(', ')); process.exit(1); }
console.log(`gallery body built: ${archiveCount} archive items, ${used.length - archiveCount} editorial images, ${used.length} total, all unique`);
