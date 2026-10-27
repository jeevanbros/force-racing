## Contact and source metadata

- Institution: Kakatiya Institute of Technology & Science, Warangal (homepage); workshop address: Central Workshop, Kakatiya Institute of Technology & Science, Warangal – 506015, Telangana, India. Contact page also says “KITS WARANGAL WORKSHOP”, Hanamkonda, Telangana, IN.
- Email: team.force.racing.kitsw@gmail.com. Telephone: +91-8008391525 (labelled Team Manager on the contact page).
- Homepage states established in 2009, 60 members primarily from Mechanical Engineering, annual Formula Student car design/manufacture/competition, and alumni in Formula 1 and engineering consultancy. These are source claims, not newly verified assertions.
- Homepage description: “Force Racing is a Formula Student team building high performance race cars in India.” Keywords: Force Racing, KITS Warangal, KITSW, Formula Student India, SAE SUPRA, race car team. Language en; viewport responsive; footer © 2026. Other pages have titles, charset and viewport metadata but no description. No canonical URL or Open Graph metadata was found.
- `/` and `/index.html` are byte-identical copies: six HTML URLs represent five distinct pages. Sitemap includes home, team, cars and contact; support was found through navigation. No linked PDF or standalone JavaScript resource was found; menu JavaScript is inline in each HTML document.
- Google Maps embed (contact page and homepage) is preserved as an external reference in `source/manifest.json`; it was not scraped. Social links are listed above with original query parameters.

## Partners preserved from homepage

The heading is “THEY BELIEVED IN US”; it does not establish current sponsorship. All 13 images have empty alt text and no outbound partner links. Names below are visible logo readings or explicitly marked filename evidence.

| Name/evidence | Local original image |
| --- | --- |
| ANSYS | `source/images/ANSYS.png` |
| SolidWorks | `source/images/solidworks.jpg` |
| Lotus (filename evidence) | `source/images/lotus.jpg` |
| KTM | `source/images/ktm.png` |
| Hoosier | `source/images/Hoosier.png` |
| Wilwood | `source/images/wilwood.png` |
| Burnout by 3 Brothers | `source/images/burnout.png` |
| ASAP Motorsports | `source/images/ASAP.png` |
| Stylised FC mark; full organisation name not supplied | `source/images/fc.jpg` |
| SR Welding | `source/images/sr.png` |
| Rajput AutoCorp | `source/images/rajput.jpg` |
| Stylised CT mark; file named Composites.jpg, full organisation name not supplied | `source/images/Composites.jpg` |
| 3Dfy | `source/images/3dfy.png` |

## Best original hero photographs

Visually inspected using local contact sheets: `source/_archive/asset-contact-sheet.jpg` and `source/_archive/car-contact-sheet.jpg`. Dimensions below are measured from the downloaded original files. Recommendations concern composition, not permission or current event attribution.

| Rank/use | Original local image | Dimensions | Composition and crop guidance |
| --- | --- | --- | --- |
| 1 — wide desktop/projection hero | `source/images/carbanner.jpg` | 2048 × 1158 | Broad motorsport grid with cars in foreground and crowd behind. Best landscape resolution among actual event photographs. Keep the grid visible; crowded frame benefits from a restrained dark text overlay. It depicts an event field, not exclusively Force Racing cars. |
| 2 — mobile/car atmosphere | `source/images/supra26-bic.jpeg` | 1080 × 1920 | Portrait pit-lane image of the red/white car; current homepage background and FR 26 card image. Preserve the car in the lower-middle frame. A wide cover crop discards most vertical context and uses only about 1080 × 608 pixels at 16:9; poor for large projection. |
| 3 — panoramic vehicle/history strip | `source/images/contactbanner.jpeg` | 1600 × 513 | Multiple cars and people; wide native ratio works for a shallow banner. Avoid deep mobile crops and tall heroes. |
| 4 — team/about hero | `source/images/heroimg.jpg` | 1080 × 634 | Team standing with car against pale sky; useful group composition. Preserve people at both edges; limited resolution for full-screen projection. |
| 5 — team celebration strip | `source/images/teambanner.jpg` | 1080 × 327 | Trophy/celebration group, already shallow. Better as a strip than a full-height hero. |

`fr16.jpeg` (1063 × 1063) and `ratham.jpeg` (954 × 954) are useful tighter vehicle features. Many historical thumbnails are only 237–569 pixels wide and should stay small. `become-our-partner.jpg` is 4000 × 2250 but shows a generic handshake; archived because it is a source dependency, with no new stock assets added.

## Functional gaps and limits

- Support page claims an official KITS payment gateway, but “PROCEED TO PAYMENT PORTAL” links only to `#`. No payment URL is available in the source.
- Contact form declares POST `form-handler.php` with name, email, Subject and Message fields. This endpoint was recorded without requesting or submitting it, so its availability and delivery are unverified. Source form metadata is in `source/content.json` and the readable extraction.
- Only unavailable requested resource: `https://www.forceracing.in/robots.txt` (HTTP 404). Its original response body and headers are retained. All discovered page and rendering-asset requests returned HTTP 200.
- No technical car specifications, downloadable specification PDF, individual member photographs, or campaign page was linked by the archived site. Preserve that absence rather than inventing values.
- Raw originals retain all source links. The local preview rewrites downloaded asset/navigation URLs, including external CSS/font dependencies, to local paths. Google Maps, social profiles and form delivery remain network-dependent features.
