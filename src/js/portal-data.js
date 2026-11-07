/**
 * Sample student data for the dashboard prototype. Everything here is placeholder content:
 * - course names, durations and descriptions come from the public site;
 * - module names reuse each course's published "skills covered"; lesson counts are sample numbers;
 * - NO instructors, certifications or achievements are invented (instructor is "to be assigned");
 * - dates are offsets from today so the schedule always looks current.
 */
export const STUDENT = {
  name: 'Alex Moreau',
  email: 'alex.student@example.com',
  phone: '+33 1 23 45 67 89',
  city: 'Paris',
  bio: '',
  programme: 'Diploma in Fashion Designing',
  id: 'SAMPLE-0001',
};

const mod = (title, lessons, done) => ({ title, lessons, done });

export const COURSES = [
  {
    id: 'dip', name: 'Diploma in Fashion Designing', duration: '12 Months', image: '../assets/images/course-dress-form.jpg',
    alt: 'Two fashion designers draping a garment on a dress form', pos: '50% 50%',
    short: 'A complete foundation in design, pattern cutting and garment construction, built around a graduate collection.',
    modules: [mod('Design development', 8, 8), mod('Pattern cutting', 8, 5), mod('Garment construction', 8, 0), mod('Graduate collection', 8, 0)],
  },
  {
    id: 'ill', name: 'Fashion Illustration', duration: '6 Months', image: '../assets/images/course-illustration.jpg',
    alt: 'Fashion illustration sketches laid out on paper', pos: '50% 40%',
    short: 'Learn to draw the figure, the fabric and the idea, by hand and in digital media.',
    modules: [mod('Figure drawing', 6, 6), mod('Fabric rendering', 6, 3), mod('Communicating ideas', 6, 0), mod('Hand & digital media', 6, 0)],
  },
  {
    id: 'tex', name: 'Textile Designing', duration: '9 Months', image: '../assets/images/course-fabric-palette.jpg',
    alt: 'Hands choosing colourful fabric samples from a design palette', pos: '50% 38%',
    short: 'Explore print, surface and weave, and turn colour and pattern into fabric with a voice of its own.',
    modules: [mod('Print', 6, 6), mod('Surface', 6, 6), mod('Weave', 6, 6), mod('Colour & pattern', 6, 6)],
  },
];

export const ASSIGNMENTS = [
  { id: 'a1', title: 'Design development sketchbook', course: 'dip', due: 3, status: 'pending', text: 'Sample brief: assemble your design development pages for review.' },
  { id: 'a2', title: 'Pattern block submission', course: 'dip', due: 9, status: 'pending', text: 'Sample brief: submit your pattern blocks with notes on fit.' },
  { id: 'a3', title: 'Garment construction sample', course: 'dip', due: -2, status: 'submitted', text: 'Sample brief: a construction sample showing your chosen techniques.' },
  { id: 'a4', title: 'Figure drawing study sheet', course: 'ill', due: 5, status: 'pending', text: 'Sample brief: a sheet of figure studies in your preferred medium.' },
  { id: 'a5', title: 'Fabric rendering exercise', course: 'ill', due: -6, status: 'submitted', text: 'Sample brief: render three fabrics so their weight and surface read clearly.' },
  { id: 'a6', title: 'Hand & digital media page', course: 'ill', due: -1, status: 'pending', text: 'Sample brief: one portfolio page combining hand and digital work.' },
  { id: 'a7', title: 'Colour & pattern palette', course: 'tex', due: -20, status: 'submitted', text: 'Sample brief: a colour and pattern palette developed into swatches.' },
];

export const CLASSES = [
  { id: 'c1', day: -2, time: '10:00', mins: 120, title: 'Garment construction', type: 'Studio', course: 'dip' },
  { id: 'c2', day: 0, time: '14:00', mins: 120, title: 'Pattern cutting', type: 'Studio', course: 'dip' },
  { id: 'c3', day: 1, time: '10:00', mins: 90, title: 'Figure drawing', type: 'Studio', course: 'ill' },
  { id: 'c4', day: 2, time: '11:30', mins: 60, title: 'Portfolio critique', type: 'Critique', course: 'dip' },
  { id: 'c5', day: 3, time: '15:00', mins: 90, title: 'Fabric rendering', type: 'Lecture', course: 'ill' },
  { id: 'c6', day: 5, time: '10:00', mins: 180, title: 'Draping workshop', type: 'Workshop', course: 'dip' },
  { id: 'c7', day: 6, time: '13:00', mins: 120, title: 'Hand & digital media', type: 'Studio', course: 'ill' },
  { id: 'c8', day: 8, time: '10:00', mins: 60, title: 'Design development review', type: 'Critique', course: 'dip' },
];

export const ANNOUNCEMENTS = [
  { id: 'n1', day: 0, title: 'Welcome to the student portal', short: 'This prototype portal gathers your courses, assignments and schedule.', more: 'Everything you see here is sample content for the prototype. It will be replaced when the portal is connected to real student records.' },
  { id: 'n2', day: -1, title: 'Portfolio review week (sample)', short: 'Sample notice about an upcoming portfolio review.', more: 'This is a sample announcement. Real dates and requirements would be published here by the institute.' },
  { id: 'n3', day: -3, title: 'Studio access reminder (sample)', short: 'Sample reminder about booking studio time.', more: 'This is a sample announcement used to show how longer updates expand with Read more.' },
  { id: 'n4', day: -6, title: 'New term materials (sample)', short: 'Sample notice about new term course materials.', more: 'This is a sample announcement. Course materials would be linked from the relevant course page.' },
];
