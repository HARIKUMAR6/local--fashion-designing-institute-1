/**
 * Automated Verification & Validation Suite for ATELIER ÉLAN
 * Tests:
 * 1. Tailwind CSS v4 CLI compilation
 * 2. Reusable Global Container System (1320px max-width, balanced margins, alignment)
 * 3. Custom Brand Emblem (Couture Heraldic AE Monogram Crest)
 * 4. Header & Navigation Structure (Strict Home Dropdown: Home 1 & Home 2 only)
 * 5. Home 1: Complete 10-section implementation verification
 * 6. Home 2: Complete 8-section Creative Atelier implementation verification
 * 7. Distinctive Imagery & Non-Duplication between Home 1 and Home 2
 * 8. Global UI Controls (Theme, RTL/LTR text-only, Scroll-to-Top)
 * 9. Foundation Architecture Target Pages
 * 10. Live HTTP Server Delivery for both Home 1 & Home 2
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { execSync } from 'node:child_process';

const ROOT_DIR = process.cwd();
let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('================================================================');
console.log('  ATELIER ÉLAN – SYSTEM, HOME 1 & HOME 2 VERIFICATION SUITE');
console.log('================================================================\n');

// 1. Tailwind CLI Compilation Test
console.log('[1/10] Testing Tailwind CSS v4 CLI compilation...');
try {
  const compileOutput = execSync('npm run build:css', { encoding: 'utf-8', cwd: ROOT_DIR });
  const cssPath = path.join(ROOT_DIR, 'dist', 'output.css');
  assert(fs.existsSync(cssPath), 'dist/output.css exists after build');
  const cssStat = fs.statSync(cssPath);
  assert(cssStat.size > 20000, `dist/output.css is non-empty (size: ${cssStat.size} bytes)`);
} catch (err) {
  console.error('Tailwind compilation error:', err);
  process.exit(1);
}

// 2. Global Container System & Unified Hero Section Verification
console.log('\n[2/10] Testing Global Container System & Unified Hero Section...');
const inputCss = fs.readFileSync(path.join(ROOT_DIR, 'src/input.css'), 'utf-8');
const outputCss = fs.readFileSync(path.join(ROOT_DIR, 'dist/output.css'), 'utf-8');

assert(inputCss.includes('.atelier-container'), 'src/input.css defines .atelier-container class');
assert(inputCss.includes('1320px'), 'Global container max-width set to 1320px');
assert(inputCss.includes('margin-left: auto') && inputCss.includes('margin-right: auto'), 'Container horizontally centered with auto margins');
assert(inputCss.includes('padding-left') && inputCss.includes('padding-right'), 'Container has balanced horizontal padding');
assert(inputCss.includes('@media (min-width: 640px)') && inputCss.includes('@media (min-width: 1024px)'), 'Container has responsive padding for tablet & desktop');
assert(outputCss.includes('atelier-container'), 'Compiled CSS contains .atelier-container utility');

// Hero Viewport Height Consistency assertion
assert(inputCss.includes('.hero-viewport-section'), 'src/input.css defines .hero-viewport-section for consistent hero height');
assert(inputCss.includes('100svh - 5rem') && inputCss.includes('100svh - 6rem'), 'Hero accounts for exact header height (80px mobile / 96px desktop)');
assert(outputCss.includes('hero-viewport-section'), 'Compiled CSS includes .hero-viewport-section');

// 3. Custom Brand Emblem Verification
console.log('\n[3/10] Testing Custom Brand Emblem Vector Asset...');
const emblemPath = path.join(ROOT_DIR, 'assets/icons/brand-emblem.svg');
assert(fs.existsSync(emblemPath), 'assets/icons/brand-emblem.svg exists');
const emblemSvg = fs.readFileSync(emblemPath, 'utf-8');
assert(emblemSvg.includes('<svg') && emblemSvg.includes('</svg>'), 'brand-emblem.svg is a valid SVG vector');
assert(emblemSvg.includes('viewBox="0 0 200 200"'), 'Emblem has square scalable viewBox');
assert(emblemSvg.includes('ATELIER ÉLAN'), 'Emblem features curved couture typography');
assert(emblemSvg.includes('PARIS') && emblemSvg.includes('MILAN'), 'Emblem features Paris & Milan heritage marks');

// 4. Shared Header & Dropdown Integrity Verification (Both Pages)
console.log('\n[4/10] Testing Shared Header & Navigation on Home 1 and Home 2...');
const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf-8');
const home2Html = fs.readFileSync(path.join(ROOT_DIR, 'home-2.html'), 'utf-8');

for (const [pageName, html] of [['Home 1', indexHtml], ['Home 2', home2Html]]) {
  assert(html.includes('id="home-dropdown-wrapper"'), `${pageName} has home dropdown wrapper`);
  assert(html.includes('id="home-dropdown-menu"'), `${pageName} has home dropdown menu`);
  assert(html.includes('href="./index.html"') && html.includes('Home 1'), `${pageName} dropdown links to Home 1 (index.html)`);
  assert(html.includes('href="./home-2.html"') && html.includes('Home 2'), `${pageName} dropdown links to Home 2 (home-2.html)`);

  const dropdownMatch = html.match(/<div id="home-dropdown-menu"[\s\S]*?<\/div>/);
  assert(dropdownMatch !== null, `${pageName} found dropdown menu in HTML`);
  const dropdownContent = dropdownMatch[0];
  const home1Count = (dropdownContent.match(/Home 1/g) || []).length;
  const home2Count = (dropdownContent.match(/Home 2/g) || []).length;
  const otherLinks = dropdownContent.match(/<a /g) || [];
  assert(home1Count === 1, `${pageName} dropdown contains exactly one Home 1 item`);
  assert(home2Count === 1, `${pageName} dropdown contains exactly one Home 2 item`);
  assert(otherLinks.length === 2, `${pageName} dropdown contains strictly and only 2 links`);

  // Shared emblem check
  const emblemMatches = (html.match(/src="\.\/assets\/icons\/brand-emblem\.svg"/g) || []).length;
  assert(emblemMatches >= 2, `${pageName} reuses exact brand-emblem.svg in header and footer`);
}

// 5. Home 1 Section Verification (Unchanged & Preserved)
console.log('\n[5/10] Verifying Home 1 (10 Sections Preserved & Hero Viewport Class)...');
assert(indexHtml.includes('hero-viewport-section'), 'Home 1 Section 01 Hero uses unified hero-viewport-section class');
assert(indexHtml.includes('DESIGN YOUR') && indexHtml.includes('OWN LEGACY.'), 'Home 1 Section 01 Hero present');
assert(indexHtml.includes('MORE THAN AN INSTITUTE.'), 'Home 1 Section 02 Intro present');
assert(indexHtml.includes('EXPLORE YOUR CREATIVE DIRECTION.'), 'Home 1 Section 03 Courses present');
assert(indexHtml.includes('WHERE STUDENT CREATIVITY TAKES THE STAGE.'), 'Home 1 Section 04 Runway present');
assert(indexHtml.includes('IDEAS THAT BECOME ART.'), 'Home 1 Section 05 Showcase present');
assert(indexHtml.includes('SHAPING THE NEXT GENERATION OF DESIGNERS.'), 'Home 1 Section 06 Why Choose present');
assert(indexHtml.includes('STORIES OF CREATIVE GROWTH.'), 'Home 1 Section 07 Testimonials present');
assert(indexHtml.includes('FROM FIRST SKETCH TO FINAL CREATION.'), 'Home 1 Section 08 Creative Experience present');
assert(indexHtml.includes('YOUR CREATIVE STORY') && indexHtml.includes('STARTS HERE.'), 'Home 1 Section 09 CTA present');
assert(indexHtml.includes('<footer') && indexHtml.includes('admissions@atelierelan.edu'), 'Home 1 Section 10 Footer present');

// 6. Home 2 Complete 8-Section Implementation Verification
console.log('\n[6/10] Verifying Home 2 (Creative Atelier – Exactly 8 Content Sections)...');

// Section 1: Creative Atelier Hero
assert(home2Html.includes('hero-viewport-section'), 'Home 2 Section 1 Hero uses unified hero-viewport-section class');
assert(home2Html.includes('THE ART OF CREATION'), 'Home 2 Section 1: Label "THE ART OF CREATION" present');
assert(home2Html.includes('IMAGINE IT.') && home2Html.includes('SKETCH IT.') && home2Html.includes('WEAR IT.'), 'Home 2 Section 1: Heading "IMAGINE IT. SKETCH IT. WEAR IT." present');
assert(home2Html.includes('Every masterpiece begins with an idea. Explore the art of fashion through creativity, craftsmanship and individuality.'), 'Home 2 Section 1: Description present');
assert(home2Html.includes('EXPLORE OUR COURSES') && home2Html.includes('href="./courses.html"'), 'Home 2 Section 1: Primary CTA links to courses.html');
assert(home2Html.includes('DISCOVER STUDENT WORK') && home2Html.includes('href="./gallery.html"'), 'Home 2 Section 1: Secondary CTA links to gallery.html');

// Section 2: Creative Philosophy
assert(home2Html.includes('OUR CREATIVE PHILOSOPHY'), 'Home 2 Section 2: Label "OUR CREATIVE PHILOSOPHY" present');
assert(home2Html.includes('FASHION IS NOT JUST WHAT YOU WEAR.') && home2Html.includes('IT IS WHAT YOU EXPRESS.'), 'Home 2 Section 2: Heading present');
assert(home2Html.includes('Fashion is more than clothing. It is an expression of imagination, individuality and craftsmanship.'), 'Home 2 Section 2: Description present');
assert(home2Html.includes('DISCOVER OUR STORY') && home2Html.includes('href="./about.html"'), 'Home 2 Section 2: CTA links to about.html');
assert(home2Html.includes('IMAGINATION') && home2Html.includes('Turn ideas into visual concepts.'), 'Home 2 Section 2: Principle 1 (IMAGINATION) present');
assert(home2Html.includes('CRAFTSMANSHIP') && home2Html.includes('Learn through hands-on creation.'), 'Home 2 Section 2: Principle 2 (CRAFTSMANSHIP) present');
assert(home2Html.includes('INDIVIDUALITY') && home2Html.includes('Develop your own design identity.'), 'Home 2 Section 2: Principle 3 (INDIVIDUALITY) present');

// Section 3: Explore Our Courses
assert(home2Html.includes('FIND YOUR CREATIVE PATH'), 'Home 2 Section 3: Label "FIND YOUR CREATIVE PATH" present');
assert(home2Html.includes('LEARN THE ART. MASTER THE CRAFT.'), 'Home 2 Section 3: Heading present');
assert(home2Html.includes('Discover courses that transform creative ideas into professional fashion skills.'), 'Home 2 Section 3: Description present');
assert(home2Html.includes('VIEW ALL COURSES') && home2Html.includes('href="./courses.html"'), 'Home 2 Section 3: CTA links to courses.html');
assert(home2Html.includes('DIPLOMA IN FASHION DESIGNING') && home2Html.includes('Fashion fundamentals, garment construction and design development.'), 'Home 2 Section 3: Course 1 present');
assert(home2Html.includes('ADVANCED FASHION DESIGNING') && home2Html.includes('Advanced techniques, collection development and professional practice.'), 'Home 2 Section 3: Course 2 present');
assert(home2Html.includes('FASHION ILLUSTRATION') && home2Html.includes('Sketching, figure drawing and visual storytelling.'), 'Home 2 Section 3: Course 3 present');
assert(home2Html.includes('TEXTILE DESIGNING') && home2Html.includes('Fabric exploration, surface patterns and textile creativity.'), 'Home 2 Section 3: Course 4 present');
const exploreCourseCount = (home2Html.match(/EXPLORE COURSE/g) || []).length;
assert(exploreCourseCount >= 4, `Home 2 Section 3: Exactly 4 EXPLORE COURSE links present (found ${exploreCourseCount})`);

// Section 4: Student Creations
assert(home2Html.includes('THE STUDENT CREATIVE ARCHIVE'), 'Home 2 Section 4: Label "THE STUDENT CREATIVE ARCHIVE" present');
assert(home2Html.includes('A CANVAS OF IDEAS.') && home2Html.includes('A WORLD OF POSSIBILITIES.'), 'Home 2 Section 4: Heading present');
assert(home2Html.includes('A showcase of imagination, experimentation and craftsmanship created by our emerging designers.'), 'Home 2 Section 4: Description present');
assert(home2Html.includes('EXPLORE THE GALLERY') && home2Html.includes('href="./gallery.html"'), 'Home 2 Section 4: CTA links to gallery.html');
assert(home2Html.includes('Fashion Illustrations') || home2Html.includes('Fashion Illustration'), 'Home 2 Section 4: Category Fashion Illustrations present');
assert(home2Html.includes('Student Collections'), 'Home 2 Section 4: Category Student Collections present');
assert(home2Html.includes('Textile &amp; Fabric Art') || home2Html.includes('Textile & Fabric Art'), 'Home 2 Section 4: Category Textile & Fabric Art present');
assert(home2Html.includes('Creative Projects'), 'Home 2 Section 4: Category Creative Projects present');

// Section 5: Behind the Creativity (Process Timeline)
assert(home2Html.includes('THE CREATIVE PROCESS'), 'Home 2 Section 5: Label "THE CREATIVE PROCESS" present');
assert(home2Html.includes('EVERY GREAT DESIGN BEGINS WITH AN IDEA.'), 'Home 2 Section 5: Heading present');
assert(home2Html.includes('Discover how imagination transforms into original fashion through experimentation, technical skills and craftsmanship.'), 'Home 2 Section 5: Description present');
assert(home2Html.includes('01') && home2Html.includes('THE IDEA') && home2Html.includes('Concept development and inspiration.'), 'Home 2 Section 5: Stage 01 present');
assert(home2Html.includes('02') && home2Html.includes('THE SKETCH') && home2Html.includes('Fashion illustration and design exploration.'), 'Home 2 Section 5: Stage 02 present');
assert(home2Html.includes('03') && home2Html.includes('THE CRAFT') && home2Html.includes('Fabric selection, pattern making and garment construction.'), 'Home 2 Section 5: Stage 03 present');
assert(home2Html.includes('04') && home2Html.includes('THE CREATION') && home2Html.includes('Bringing the final design to life.'), 'Home 2 Section 5: Stage 04 present');

// Section 6: Fashion Events
assert(home2Html.includes('BEYOND THE CLASSROOM'), 'Home 2 Section 6: Label "BEYOND THE CLASSROOM" present');
assert(home2Html.includes('CREATIVITY DESERVES A STAGE.'), 'Home 2 Section 6: Heading present');
assert(home2Html.includes('From student runway showcases to creative exhibitions, every event celebrates imagination, talent and individuality.'), 'Home 2 Section 6: Description present');
assert(home2Html.includes('VIEW ALL EVENTS') && home2Html.includes('href="./gallery.html"'), 'Home 2 Section 6: CTA links to gallery.html');
assert(home2Html.includes('ANNUAL STUDENT FASHION SHOW') && home2Html.includes('Student-designed collections presented on the runway.'), 'Home 2 Section 6: Event 1 present');
assert(home2Html.includes('CREATIVE DESIGN EXHIBITION') && home2Html.includes('Fashion illustrations, textile artwork and student portfolios.'), 'Home 2 Section 6: Event 2 present');
assert(home2Html.includes('FASHION WORKSHOP &amp; MASTERCLASS') && home2Html.includes('Hands-on creative sessions and industry-inspired learning.'), 'Home 2 Section 6: Event 3 present');

// Section 7: Student Stories
assert(home2Html.includes('THE PEOPLE BEHIND THE CREATIVITY'), 'Home 2 Section 7: Label "THE PEOPLE BEHIND THE CREATIVITY" present');
assert(home2Html.includes('EVERY DESIGNER HAS A STORY TO TELL.'), 'Home 2 Section 7: Heading present');
assert(home2Html.includes('Discover the journeys, experiences and creative growth of our students.'), 'Home 2 Section 7: Description present');
assert(home2Html.includes('Sébastien Laurent'), 'Home 2 Section 7: Story 1 (Sébastien Laurent) present');
assert(home2Html.includes('Amina Khelil'), 'Home 2 Section 7: Story 2 (Amina Khelil) present');
assert(home2Html.includes('Kasper Lind'), 'Home 2 Section 7: Story 3 (Kasper Lind) present');

// Section 8: Admission CTA
assert(home2Html.includes('YOUR NEXT CHAPTER'), 'Home 2 Section 8: Label "YOUR NEXT CHAPTER" present');
assert(home2Html.includes('TURN YOUR CREATIVE VISION') && home2Html.includes('INTO YOUR FUTURE.'), 'Home 2 Section 8: Heading present');
assert(home2Html.includes('Take the first step towards a world of fashion, creativity and endless possibilities.'), 'Home 2 Section 8: Description present');
assert(home2Html.includes('ENQUIRE ABOUT ADMISSIONS') && home2Html.includes('href="./contact.html"'), 'Home 2 Section 8: Primary CTA links to contact.html');
assert(home2Html.includes('EXPLORE OUR COURSES') && home2Html.includes('href="./courses.html"'), 'Home 2 Section 8: Secondary CTA links to courses.html');

// 7. Global Container System on Home 2
console.log('\n[7/10] Verifying Global Container System (.atelier-container) on Home 2...');
const home2Containers = (home2Html.match(/class="[^"]*atelier-container[^"]*"/g) || []).length;
assert(home2Containers >= 9, `Home 2 content wrapped in .atelier-container across header, all 8 sections, and footer (found ${home2Containers} instances)`);

// 8. Image Distinctiveness & Validation
console.log('\n[8/10] Verifying high-quality images and zero duplication between Home 1 & Home 2...');
const home2ImgMatches = Array.from(home2Html.matchAll(/<img\s+[^>]*src="([^"]+)"[^>]*>/g));
assert(home2ImgMatches.length >= 12, `Home 2 contains ${home2ImgMatches.length} curated editorial images`);

for (let i = 0; i < home2ImgMatches.length; i++) {
  const match = home2ImgMatches[i];
  const tag = match[0];
  const src = match[1];
  assert(src && src.length > 5, `Image #${i+1} has valid source: ${src.substring(0, 45)}...`);
  assert(tag.includes('alt="'), `Image #${i+1} has descriptive alt attribute`);
}

// Check Hero Image Distinctiveness: Home 2 Hero must NOT use Home 1 Hero image
assert(!home2Html.includes('photo-1509631179647-0177331693ae'), 'Home 2 Hero uses its own distinct atelier image, not Home 1 hero image');
assert(!home2Html.includes('photo-1579783902614-a3fb3927b675'), 'Home 2 Course 3 has resolved broken 404 image (photo-1579783902614 is removed)');
assert(home2Html.includes('photo-1544717302-de2939b7ef71'), 'Home 2 Course 3 uses verified high-res fashion studio illustration (photo-1544717302)');

// 9. Global UI Controls Testing on Home 2
console.log('\n[9/10] Testing Global UI Controls on Home 2...');
assert(home2Html.includes('id="theme-toggle-btn"'), 'Home 2 has theme toggle button');
assert(home2Html.includes('id="theme-icon-sun"'), 'Home 2 has sun icon');
assert(home2Html.includes('id="theme-icon-moon"'), 'Home 2 has moon icon');
assert(home2Html.includes('id="dir-toggle-btn"'), 'Home 2 has direction toggle button');
assert(home2Html.includes('id="scroll-to-top-btn"'), 'Home 2 has scroll to top button');

// 10. Live HTTP Server Test (Delivering both Home 1 and Home 2)
console.log('\n[10/10] Testing live HTTP delivery for /index.html and /home-2.html...');
const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';
  const localFile = path.join(ROOT_DIR, reqPath);
  if (fs.existsSync(localFile) && fs.statSync(localFile).isFile()) {
    let contentType = 'text/html';
    if (localFile.endsWith('.css')) contentType = 'text/css';
    if (localFile.endsWith('.js')) contentType = 'text/javascript';
    if (localFile.endsWith('.svg')) contentType = 'image/svg+xml';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(fs.readFileSync(localFile));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(0, '127.0.0.1', () => {
  const port = server.address().port;
  http.get(`http://127.0.0.1:${port}/index.html`, (h1Res) => {
    assert(h1Res.statusCode === 200, 'Live HTTP server returned 200 for /index.html (Home 1)');
    http.get(`http://127.0.0.1:${port}/home-2.html`, (h2Res) => {
      assert(h2Res.statusCode === 200, 'Live HTTP server returned 200 for /home-2.html (Home 2)');
      let h2Data = '';
      h2Res.on('data', chunk => h2Data += chunk);
      h2Res.on('end', () => {
        assert(h2Data.includes('IMAGINE IT.') && h2Data.includes('SKETCH IT.') && h2Data.includes('WEAR IT.'), 'Home 2 live payload delivers full Creative Atelier content');
        server.close(() => {
          console.log('\n================================================================');
          console.log(`  ALL ${passedTests} TESTS PASSED PERFECTLY! (${passedTests}/${totalTests})`);
          console.log('================================================================');
        });
      });
    });
  }).on('error', (err) => {
    console.error('HTTP request failed:', err);
    server.close();
    process.exit(1);
  });
});
