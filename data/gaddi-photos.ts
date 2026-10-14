// Photos of Gaddi life used on the homepage, from Wikimedia Commons. Files live in public/images/gaddi/.
// The licence requires the credit to be shown wherever the photo appears.
export interface GaddiPhoto { file: string; author: string; license: string; license_url: string; source: string; title: string }

const BY_SA_4 = { license: 'CC BY-SA 4.0', license_url: 'https://creativecommons.org/licenses/by-sa/4.0' };

export const gaddiPhotos: GaddiPhoto[] = [
  { file: 'shepherd-high-pasture', author: 'Highland.dogs', title: 'A shepherd resting on a high pasture', source: 'https://commons.wikimedia.org/wiki/File:A_Gaddi_shepherd_making_lassi.jpg', ...BY_SA_4 },
  { file: 'flock-monsoon', author: 'Madhrakangri', title: 'Moving the flock through the monsoon rain', source: 'https://commons.wikimedia.org/wiki/File:Gaddi_in_chotta_bhanghal.jpg', ...BY_SA_4 },
  { file: 'packing-migration', author: 'Kmr Ramesh', title: 'Packing the camp for the next move', source: 'https://commons.wikimedia.org/wiki/File:Gaddi_shepherd_alongwith_essentialities_of_migration.jpg', ...BY_SA_4 },
  { file: 'gaddan-grandmother', author: 'John Hill', title: 'A Gaddan grandmother with her grandchildren and dog', source: 'https://commons.wikimedia.org/wiki/File:Gaddi_woman_in_traditional_dress_with_children_and_dog.jpg', ...BY_SA_4 },
  { file: 'folk-dance', author: 'Kalitgautam', title: 'Gaddi men dancing in chola and dora', source: 'https://commons.wikimedia.org/wiki/File:Gaddi_tribe_folk_dance.jpg', ...BY_SA_4 },
];
