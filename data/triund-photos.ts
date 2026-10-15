// Photos of the Triund trek above McLeod Ganj and Dharamkot, from Wikimedia Commons.
// Files live in public/images/triund/. The licence requires the credit to be shown wherever the photo appears.
// The first entry is the wide hero shot.
export interface TriundPhoto { file: string; author: string; license: string; license_url: string; source: string; title: string; alt: string }

const BY_SA_4 = { license: 'CC BY-SA 4.0', license_url: 'https://creativecommons.org/licenses/by-sa/4.0' };
const BY_SA_3 = { license: 'CC BY-SA 3.0', license_url: 'https://creativecommons.org/licenses/by-sa/3.0' };
const BY_SA_2 = { license: 'CC BY-SA 2.0', license_url: 'https://creativecommons.org/licenses/by-sa/2.0' };
const BY_2 = { license: 'CC BY 2.0', license_url: 'https://creativecommons.org/licenses/by/2.0' };

export const triundPhotos: TriundPhoto[] = [
  { file: 'triund-hikers-dhauladhar-ridge', author: 'Aliya Tour Packages', title: 'Hikers on the Triund ridge', alt: 'Hikers walking along the grassy Triund ridge with the snow-covered Dhauladhar range rising behind', source: 'https://commons.wikimedia.org/wiki/File:Triund-trek-mcleodganj-himachal-pradesh-india.jpg', ...BY_SA_4 },
  { file: 'triund-trekkers-meadow', author: 'Ashish Gupta from Noida, India', title: 'Setting off across the Triund meadow', alt: 'Trekkers with backpacks crossing the green Triund meadow among granite boulders towards Laka Got', source: 'https://commons.wikimedia.org/wiki/File:Hiking_off_to_Laka_Got_from_Triund_(16285401872).jpg', ...BY_2 },
  { file: 'triund-camp-dhauladhar-golden-hour', author: 'Ashutosh Tiwari', title: 'Camp below the Dhauladhar at golden hour', alt: 'Blue tents pitched on Triund hilltop as evening light turns the Dhauladhar range pink and gold', source: 'https://commons.wikimedia.org/wiki/File:Triund_2@ashu.jpg', ...BY_SA_4 },
  { file: 'triund-forest-trail', author: 'Ashish Gupta from Noida, India', title: 'The stone trail through the forest', alt: 'Two trekkers with backpacks climbing the stone-paved Triund trail through green forest above Dharamkot', source: 'https://commons.wikimedia.org/wiki/File:Trail_to_Triund_(16098705148).jpg', ...BY_2 },
  { file: 'triund-campsite-night', author: 'Alok Kumar', title: 'Night at the Triund campsite', alt: 'Tents among boulders on Triund hill under a starry night sky, with the lights of the Kangra valley below', source: 'https://commons.wikimedia.org/wiki/File:Triund_hill_campsite.jpg', ...BY_SA_4 },
  { file: 'dhauladhar-sunset-from-triund', author: 'Ashish Gupta from Noida, India', title: 'Last light on the Dhauladhar', alt: 'Sunset glow lighting the slopes of the Dhauladhar range, seen from Triund', source: 'https://commons.wikimedia.org/wiki/File:Sunset_from_Triund_(16098701318).jpg', ...BY_2 },
  { file: 'snowline-cafe-triund', author: 'Ktoya', title: 'Snowline Café above Triund', alt: 'Tarp-roofed Snowline Café and tents on the meadow above Triund, below the rocky Dhauladhar peaks', source: 'https://commons.wikimedia.org/wiki/File:Ktoya,_Snowline_Cafe,_Triund_97.jpg', ...BY_SA_3 },
  { file: 'view-down-from-triund', author: 'Kiran Jonnalagadda from Bangalore, India', title: 'The towns below the trail', alt: 'View from the Triund trail down to the hill towns around McLeod Ganj and the hazy Kangra valley beyond', source: 'https://commons.wikimedia.org/wiki/File:Five_towns_in_one_view_from_Triund_(8680903208).jpg', ...BY_SA_2 },
];
