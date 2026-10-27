# Force Racing source inventory

Crawl started: 2026-10-27T15:51:00.006735+00:00
Crawl finished: 2026-10-27T15:51:51.598878+00:00

Seed: https://www.forceracing.in/ plus robots.txt and sitemap.xml. Same-domain navigation is followed to exhaustion; externally hosted rendering dependencies are archived recursively. External social/profile/map pages and form submissions are recorded but not requested. Only public HTTP GETs were made.

## Reproduce and inspect

```sh
python3 source/crawl.py
python3 source/crawl.py --verify-only
python3 -m http.server 8080 --directory source
```

Open http://localhost:8080/ for the local mirror. `source/originals/<host>/` holds unmodified response bodies; `source/index.html` and sibling files form a preview with downloaded dependencies rewritten to local paths. Query variants use deterministic `__q_<hash>` names. `source/_archive/preexisting-index.html` preserves the starting file. External maps and social links still need internet; a local mirror is not a form receiving service.

`source/manifest.json` records every requested URL, response status and headers, redirects, original/mirror paths and SHA-256 hashes, referrers and dependencies. `source/content.json` contains per-page metadata, headings, tables, links, images and full readable text. [source-content.md](source-content.md) provides the readable extraction. `source/verification.json` records an independent reparse of saved originals and file-hash checks.

## Coverage and integrity

- Requested URLs: 71; HTTP 200: 70; unavailable: 1.
- HTML URLs: 6; image resources: 36.
- Successful response types: application/vnd.ms-fontobject: 2, application/xml: 1, font/ttf: 19, font/woff: 1, font/woff2: 1, image/jpeg: 23, image/png: 13, image/svg+xml: 1, text/css: 3, text/html: 6
- Eligible discovered references left unvisited: 0.
- Missing original/mirror files: 0/0; hash mismatches: 0; dangling HTML fragments: 0.
- Local mirror references checked: 219; broken: 0; rendering assets still pointing to remote HTTP URLs: 0.
- Completeness means reachable links and declared/static asset dependencies, plus the public sitemap; it cannot establish the absence of unlinked server files or JavaScript-generated URLs. Downloaded JavaScript is inspected statically, never executed. Raster dimensions use the existing Pillow package if available. All site claims, dates, specifications, affiliations and names below describe the archived source and are not independently verified.

## Unavailable resources

- https://www.forceracing.in/robots.txt — 404: HTTP Error 404: Not Found

## HTML pages

| URL | Title | Original |
| --- | --- | --- |
| https://www.forceracing.in/ | Force Racing | source/originals/www.forceracing.in/__root__.html |
| https://www.forceracing.in/index.html | Force Racing | source/originals/www.forceracing.in/index.html |
| https://www.forceracing.in/cars.html | Cars \| Force Racing | source/originals/www.forceracing.in/cars.html |
| https://www.forceracing.in/team.html | Team \| Force Racing | source/originals/www.forceracing.in/team.html |
| https://www.forceracing.in/support.html | Support Us \| Force Racing | source/originals/www.forceracing.in/support.html |
| https://www.forceracing.in/contact.html | Contact \| Force Racing | source/originals/www.forceracing.in/contact.html |

## All vehicle records

Source: https://www.forceracing.in/cars.html. The page provides names, event/year labels and photographs only. It publishes no engine, power, mass, dimensions, suspension, chassis, drivetrain, acceleration or other technical specification values. No linked specification sheets or PDFs were discovered.

| Vehicle | All source event/year labels | Photograph |
| --- | --- | --- |
| FR 26 | SUPRA SAE INDIA 2026 | https://www.forceracing.in/images/supra26-bic.jpeg |
| FR 19 | FORMULA BHARAT 2020; SUPRA SAE INDIA 2019; FFS FMAE 2019 | https://www.forceracing.in/images/fr19.jpg |
| FR 18 | FFS FMAE 2018 | https://www.forceracing.in/images/ffs18.png |
| FR 17 | FORMULA BHARAT 2017; SAE SUPRA INDIA 2017; FFS FMAE 2017 | https://www.forceracing.in/images/fr17.jpg |
| FR 16 | SUPRA SAE INDIA 2016 | https://www.forceracing.in/images/fr16.jpeg |
| LEGIONS' F1 | SAE SUPRA INDIA 2012 | https://www.forceracing.in/images/legions12.jpg |
| KART 3 | INDIAN KARTING RACE 2024 | https://www.forceracing.in/images/ikr.jpg |
| KART 2 | NEKC 2020 | https://www.forceracing.in/images/kart2.jpg |
| KART 1 | NEKC 2018; NEKC 2019 | https://www.forceracing.in/images/kart1.png |
| RATHAM | EFFI-CARS 2015 | https://www.forceracing.in/images/ratham.jpeg |
| EFFICYCLE | SAE NIS EFFICYCLE 2017 | https://www.forceracing.in/images/efficycle.jpeg |
| PHOENIX RACING | SAE NIS EFFICYCLE 2015 | https://www.forceracing.in/images/phoenix.jpg |
| ASHWASENA | SAE NIS EFFICYCLE 2013 | https://www.forceracing.in/images/ashwasena.jpg |
| TERRANAUT | SAE BAJA INDIA 2011 | https://www.forceracing.in/images/baja11.jpg |
| MAIDEN MOB | SAE BAJA INDIA 2010 | https://www.forceracing.in/images/baja10.png |

## All team records

Source: https://www.forceracing.in/team.html. Every member uses the same `images/user.jpg` silhouette; there are no individual headshots. The homepage describes a 60-member team while this page lists 15 names.

| Name | All source role/subsystem labels |
| --- | --- |
| DHANUSH | CAPTAIN; STEERING & WHEELS |
| ARUN | VICE-CAPTAIN; POWER-TRAIN |
| SOHAIL | TEAM MANAGER; CHASSIS |
| HANUMANTH | CHASSIS |
| JEEVAN | CHASSIS; LOGISTICS |
| NAVYA | CHASSIS |
| J HARSHA | SUSPENSION |
| PRASHANTH | SUSPENSION |
| KARTHIK | POWER-TRAIN |
| RAKESH | POWER-TRAIN |
| DHANYA | PUBLIC RELATIONS; POWER-TRAIN |
| MAHIDHAR | BRAKES; FINANCE |
| P HARSHA | BRAKES |
| RUTHVIK | STEERING & WHEELS |
| ASHISH | SOCIAL MEDIA |

## Social links

- https://www.instagram.com/force.racing?igsh=MXI6cGRnYjA0cGE=
- https://www.facebook.com/forceracingkitsw/
- https://youtube.com/@forceracing8847?si=3Ki2roWmQvvdFWp-
- https://www.linkedin.com/company/force-racing/

## Image dimensions and provenance

| Original URL | Dimensions | Bytes | Local preview asset |
| --- | --- | --- | --- |
| https://www.forceracing.in/favicon.png?v=1 | 1024 × 1024 | 106476 | source/favicon__q_a798de8ee75a.png |
| https://www.forceracing.in/images/logo.png | 1536 × 1024 | 2063917 | source/images/logo.png |
| https://www.forceracing.in/images/heroimg.jpg | 1080 × 634 | 87769 | source/images/heroimg.jpg |
| https://www.forceracing.in/images/ANSYS.png | 3000 × 855 | 32981 | source/images/ANSYS.png |
| https://www.forceracing.in/images/solidworks.jpg | 689 × 305 | 18398 | source/images/solidworks.jpg |
| https://www.forceracing.in/images/lotus.jpg | 620 × 349 | 22033 | source/images/lotus.jpg |
| https://www.forceracing.in/images/ktm.png | 4000 × 1748 | 117710 | source/images/ktm.png |
| https://www.forceracing.in/images/Hoosier.png | 1000 × 399 | 59192 | source/images/Hoosier.png |
| https://www.forceracing.in/images/wilwood.png | 240 × 80 | 79674 | source/images/wilwood.png |
| https://www.forceracing.in/images/burnout.png | 400 × 269 | 46439 | source/images/burnout.png |
| https://www.forceracing.in/images/ASAP.png | 444 × 151 | 42106 | source/images/ASAP.png |
| https://www.forceracing.in/images/fc.jpg | 225 × 225 | 4025 | source/images/fc.jpg |
| https://www.forceracing.in/images/sr.png | 120 × 120 | 15787 | source/images/sr.png |
| https://www.forceracing.in/images/rajput.jpg | 1116 × 998 | 45600 | source/images/rajput.jpg |
| https://www.forceracing.in/images/Composites.jpg | 332 × 318 | 11735 | source/images/Composites.jpg |
| https://www.forceracing.in/images/3dfy.png | 200 × 200 | 2195 | source/images/3dfy.png |
| https://www.forceracing.in/images/supra26-bic.jpeg | 1080 × 1920 | 185420 | source/images/supra26-bic.jpeg |
| https://www.forceracing.in/images/contactbanner.jpeg | 1600 × 513 | 236472 | source/images/contactbanner.jpeg |
| https://www.forceracing.in/images/carbanner.jpg | 2048 × 1158 | 3308165 | source/images/carbanner.jpg |
| https://www.forceracing.in/images/teambanner.jpg | 1080 × 327 | 110081 | source/images/teambanner.jpg |
| https://www.forceracing.in/images/become-our-partner.jpg | 4000 × 2250 | 1401154 | source/images/become-our-partner.jpg |
| https://www.forceracing.in/images/fr19.jpg | 498 × 498 | 68472 | source/images/fr19.jpg |
| https://www.forceracing.in/images/ffs18.png | 844 × 844 | 1202618 | source/images/ffs18.png |
| https://www.forceracing.in/images/fr17.jpg | 241 × 241 | 20524 | source/images/fr17.jpg |
| https://www.forceracing.in/images/fr16.jpeg | 1063 × 1063 | 219006 | source/images/fr16.jpeg |
| https://www.forceracing.in/images/legions12.jpg | 360 × 346 | 48341 | source/images/legions12.jpg |
| https://www.forceracing.in/images/ikr.jpg | 569 × 569 | 77536 | source/images/ikr.jpg |
| https://www.forceracing.in/images/kart2.jpg | 891 × 594 | 167271 | source/images/kart2.jpg |
| https://www.forceracing.in/images/kart1.png | 424 × 318 | 263291 | source/images/kart1.png |
| https://www.forceracing.in/images/ratham.jpeg | 954 × 954 | 143408 | source/images/ratham.jpeg |
| https://www.forceracing.in/images/efficycle.jpeg | 785 × 785 | 242579 | source/images/efficycle.jpeg |
| https://www.forceracing.in/images/phoenix.jpg | 237 × 237 | 18345 | source/images/phoenix.jpg |
| https://www.forceracing.in/images/ashwasena.jpg | 239 × 239 | 20824 | source/images/ashwasena.jpg |
| https://www.forceracing.in/images/baja11.jpg | 450 × 450 | 61698 | source/images/baja11.jpg |
| https://www.forceracing.in/images/baja10.png | 725 × 721 | 929506 | source/images/baja10.png |
| https://www.forceracing.in/images/user.jpg | 553 × 553 | 9632 | source/images/user.jpg |

## All requested URLs, status and original SHA-256

| URL | Status | Bytes | SHA-256 |
| --- | --- | --- | --- |
| https://www.forceracing.in/ | 200 | 6295 | 78b30d1f6ee059a67ac6fe8d43dafa8ab420ea133470b9db4b888384c33b39ff |
| https://www.forceracing.in/robots.txt | 404 | 79 | 9a49fd7b9d2ec76e95b428b46b3ae929cf0707149d5a4558a999432bef9a6787 |
| https://www.forceracing.in/sitemap.xml | 200 | 403 | 162028721599522b8ed28d8f2c036ccdbf4bbf968fd9378562ce31c1cbdcd19c |
| https://www.forceracing.in/favicon.png?v=1 | 200 | 106476 | ad1db7450f7b04ab1a3d552b0cc37d17de357bfc904b2e37c4bf312230d304ae |
| https://www.forceracing.in/style.css | 200 | 16795 | 205e613bf3b9201946fc44eee059570e4ba868a73f02510dc16847d1dacde6fb |
| https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap | 200 | 3706 | 264572b5e093b8cf5cd9a3b9abd56ba389aee451346ea56cf4bd332754562892 |
| https://stackpath.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css | 200 | 31000 | 799aeb25cc0373fdee0e1b1db7ad6c2f6a0e058dfadaa3379689f583213190bd |
| https://www.forceracing.in/index.html | 200 | 6295 | 78b30d1f6ee059a67ac6fe8d43dafa8ab420ea133470b9db4b888384c33b39ff |
| https://www.forceracing.in/images/logo.png | 200 | 2063917 | ad5780c071a72ccb833d739a36d9abb0eb4752ec6455cbc73c753be578a8e2a2 |
| https://www.forceracing.in/cars.html | 200 | 6679 | 86cc81b25d2729abc1b17f4e83ef9155eb9c05ecf5bf03b736704f95065cdf16 |
| https://www.forceracing.in/team.html | 200 | 6533 | 3303ea5a398587c2c27e0f44f55d0bd9315a49262ce4f88b041db76cafb81830 |
| https://www.forceracing.in/support.html | 200 | 5712 | 2851a6a2ec6696dfefdb9515e0a87c5765df1739829b98342e14b1e61908cc7d |
| https://www.forceracing.in/contact.html | 200 | 6256 | 3981fa459b494ca2a32c375f42e28b2e19e0139b93077b039bc29a01e4e6c4fb |
| https://www.forceracing.in/images/heroimg.jpg | 200 | 87769 | 6c49ed8ce7bee67525a57db425c3d839f0546fa71c54b99347e86f6559f5104e |
| https://www.forceracing.in/images/ANSYS.png | 200 | 32981 | f55109f3c32f26878baba60e4af9480ff768e17a037010861f071ece746ca7fe |
| https://www.forceracing.in/images/solidworks.jpg | 200 | 18398 | 8a333092a5e32a6caeeb01474a52b7ad2c0e5527380c0d721bc6a16fe8a139e1 |
| https://www.forceracing.in/images/lotus.jpg | 200 | 22033 | fa642a353571a391a5afff10a22575c26d12467f469bdb7dbc4d97f81af5dc61 |
| https://www.forceracing.in/images/ktm.png | 200 | 117710 | bcee206a78ed5206431d19a5ab077a6ef065b5c5100e91d2cd3bd80b98da774c |
| https://www.forceracing.in/images/Hoosier.png | 200 | 59192 | 0a2ab4694cef65cb0d986c5dc800ea3508729c64fe117af4ede082478a553b18 |
| https://www.forceracing.in/images/wilwood.png | 200 | 79674 | 4c6dfb56ead5f7465b8837e88e8266e7a3c96ba3d937cd2b073cf8cbcac30d95 |
| https://www.forceracing.in/images/burnout.png | 200 | 46439 | cec0df53d656cdab1d34468aedb70ed05e298a65aefb1025bf9bbfd8e855a86b |
| https://www.forceracing.in/images/ASAP.png | 200 | 42106 | 7699497f265dfaa8383799fa5572045bfc0f1e5a9057ae13a9d68629fb02dd2c |
| https://www.forceracing.in/images/fc.jpg | 200 | 4025 | 39b97e250b2324f3b24bb7dd5de57d31377cbdaa0cbb224814dfcb0fa83831a0 |
| https://www.forceracing.in/images/sr.png | 200 | 15787 | 2bfad5484eb36863496d9e91e303ee36405830a392fee603f85c60b0466d17f6 |
| https://www.forceracing.in/images/rajput.jpg | 200 | 45600 | f75300a94f287e3e4b08b6a1a846bfbcf3f018f48f2074b0078ef4c8e67b03a8 |
| https://www.forceracing.in/images/Composites.jpg | 200 | 11735 | 8854935dad8117f5751f7963872571db6a5b78901b4d572cc89c2741ca2005cb |
| https://www.forceracing.in/images/3dfy.png | 200 | 2195 | bf67a93d496d6de15b1e61cfa489b0dfbf82498168102651b65bab0c959ead28 |
| https://www.forceracing.in/images/supra26-bic.jpeg | 200 | 185420 | 07b615724745f305f1f2da35fa90f8855a89129849b8fbf9400d5f22e9ada1f8 |
| https://www.forceracing.in/images/contactbanner.jpeg | 200 | 236472 | c8f32411c85e8ed32edf57b895467051181299ceea4fbc604cc2f597bb7f1c9e |
| https://www.forceracing.in/images/carbanner.jpg | 200 | 3308165 | cc28e3a2d7db0db1d313b1d33c58b017a99a6bf57d962093004b5ea3af6fbc4b |
| https://www.forceracing.in/images/teambanner.jpg | 200 | 110081 | 89a2a1df3058a67f6d6612ac48e3aac949bc9924ac9507a12580db6f2bb93f1b |
| https://www.forceracing.in/images/become-our-partner.jpg | 200 | 1401154 | 63e485eeeb8a4ac0c6e3e5b1be813ce886595eb08ad946f0911ae41164040370 |
| https://fonts.gstatic.com/s/poppins/v24/pxiAyp8kv8JHgFVrJJLmE3tF.ttf | 200 | 183088 | 345d3644ef75efc6a7b39546a4c5f29fefeaa25a2a49774c4e747ff554305003 |
| https://fonts.gstatic.com/s/poppins/v24/pxiDyp8kv8JHgFVrJJLmv1plEA.ttf | 200 | 182224 | 7136819b6a71f86d37978045d98c942027a9832684dd4785ce6edaedaaad92a0 |
| https://fonts.gstatic.com/s/poppins/v24/pxiDyp8kv8JHgFVrJJLm21llEA.ttf | 200 | 180524 | 0e5364c19f28addfe81e6eedacfc0233cc2b14f196c0ec4364db43249825c0a5 |
| https://fonts.gstatic.com/s/poppins/v24/pxiGyp8kv8JHgFVrJJLedw.ttf | 200 | 178112 | d455310e3d1e4393723dbe5836cb27c351751123b89a74c7034ec60c861d5556 |
| https://fonts.gstatic.com/s/poppins/v24/pxiDyp8kv8JHgFVrJJLmg1hlEA.ttf | 200 | 176504 | cc581d84062e9ae77b33cc42c3eadc79e44ea845bf8bcf86af4c6f78dea20284 |
| https://fonts.gstatic.com/s/poppins/v24/pxiDyp8kv8JHgFVrJJLmr19lEA.ttf | 200 | 174628 | b4de1c6c4adfb29175cc846d6fc80bf317f8850aef72707f74601f8910b45436 |
| https://fonts.gstatic.com/s/poppins/v24/pxiDyp8kv8JHgFVrJJLmy15lEA.ttf | 200 | 172720 | 733b74494c0b5856045e34eea8b899f02458ca8e0b7ebd2a887a86b64d99b0d0 |
| https://fonts.gstatic.com/s/poppins/v24/pxiDyp8kv8JHgFVrJJLm111lEA.ttf | 200 | 169984 | 8d85bdf1bf460f930b2845e482d6907aaa55ad704df94e6ca7971b9fdd6a8b60 |
| https://fonts.gstatic.com/s/poppins/v24/pxiDyp8kv8JHgFVrJJLm81xlEA.ttf | 200 | 167692 | ba96639e42ae0f89b531e432f90e0618a23af72345e265c610ae1ea09741cbbe |
| https://fonts.gstatic.com/s/poppins/v24/pxiGyp8kv8JHgFVrLPTedw.ttf | 200 | 157916 | e8ffb08eb3744757c0ca87f865e6ec781ba960d6c0bbcc6821e76997e692242d |
| https://fonts.gstatic.com/s/poppins/v24/pxiByp8kv8JHgFVrLFj_V1s.ttf | 200 | 157716 | 57543fa9733173fe1ff8a6449018434810dda00e41c88bceaa0e30e7b2c7f349 |
| https://fonts.gstatic.com/s/poppins/v24/pxiByp8kv8JHgFVrLDz8V1s.ttf | 200 | 156188 | da1b33b82f5fb047fc50970643e66a09c28787013b0c7f2b771e5465f9ee6b9e |
| https://fonts.gstatic.com/s/poppins/v24/pxiEyp8kv8JHgFVrFJA.ttf | 200 | 154628 | cdedb1729acac414ed01744a11da7badb86adf13108e7bd3fa161b9323f7fe54 |
| https://fonts.gstatic.com/s/poppins/v24/pxiByp8kv8JHgFVrLGT9V1s.ttf | 200 | 152860 | fcff04f4bec2b3636f05ed894dc1f9a752c4cb587ee49857ec7a82abaf6ca016 |
| https://fonts.gstatic.com/s/poppins/v24/pxiByp8kv8JHgFVrLEj6V1s.ttf | 200 | 151516 | dae40ca7b35fe7501bda2e4140a6860b1db47330be5d3c8ab6971fd83a70e9a5 |
| https://fonts.gstatic.com/s/poppins/v24/pxiByp8kv8JHgFVrLCz7V1s.ttf | 200 | 150292 | 1984efdda0fbe207d7ac20feac2ba7c2768c92a90094b02a206c9d58cc30ff2e |
| https://fonts.gstatic.com/s/poppins/v24/pxiByp8kv8JHgFVrLDD4V1s.ttf | 200 | 149072 | 5e8a5c3c2a56c3bc1b135645ca9637b9b64dc3fed5fbf85cb5ed144e06bb6d48 |
| https://fonts.gstatic.com/s/poppins/v24/pxiByp8kv8JHgFVrLBT5V1s.ttf | 200 | 147708 | 3a05787fc423c4d73c2846beebb56378092f17ac6698ed54765b6ca11fabccc0 |
| https://stackpath.bootstrapcdn.com/font-awesome/4.7.0/fonts/fontawesome-webfont.eot?v=4.7.0 | 200 | 165742 | 7bfcab6db99d5cfbf1705ca0536ddc78585432cc5fa41bbd7ad0f009033b2979 |
| https://stackpath.bootstrapcdn.com/font-awesome/4.7.0/fonts/fontawesome-webfont.eot | 200 | 165742 | 7bfcab6db99d5cfbf1705ca0536ddc78585432cc5fa41bbd7ad0f009033b2979 |
| https://stackpath.bootstrapcdn.com/font-awesome/4.7.0/fonts/fontawesome-webfont.woff2?v=4.7.0 | 200 | 77160 | 2adefcbc041e7d18fcf2d417879dc5a09997aa64d675b7a3c4b6ce33da13f3fe |
| https://stackpath.bootstrapcdn.com/font-awesome/4.7.0/fonts/fontawesome-webfont.woff?v=4.7.0 | 200 | 98024 | ba0c59deb5450f5cb41b3f93609ee2d0d995415877ddfa223e8a8a7533474f07 |
| https://stackpath.bootstrapcdn.com/font-awesome/4.7.0/fonts/fontawesome-webfont.ttf?v=4.7.0 | 200 | 165548 | aa58f33f239a0fb02f5c7a6c45c043d7a9ac9a093335806694ecd6d4edc0d6a8 |
| https://stackpath.bootstrapcdn.com/font-awesome/4.7.0/fonts/fontawesome-webfont.svg?v=4.7.0 | 200 | 444379 | ad6157926c1622ba4e1d03d478f1541368524bfc46f51e42fe0d945f7ef323e4 |
| https://www.forceracing.in/images/fr19.jpg | 200 | 68472 | d1d259dce231e20de61eabb835d62b4b9e2a410533b0abfd2ef3ecb4d498f079 |
| https://www.forceracing.in/images/ffs18.png | 200 | 1202618 | 4b09ce52c6a697d1bbdce37953a42827cc7a30ddaee7288f3c40679e005c6db0 |
| https://www.forceracing.in/images/fr17.jpg | 200 | 20524 | 62597df4ff82e7c1ff9bbf56a78f88b5f0391006fadb30d2ae14918e1212c0da |
| https://www.forceracing.in/images/fr16.jpeg | 200 | 219006 | 530f4c335ce26fad8523527f2f101ce51d91f4736a428afb8693308598499423 |
| https://www.forceracing.in/images/legions12.jpg | 200 | 48341 | 892cce659b1bf6c217fd5161edde15c7cbb51f1f36fd1b70495aa11d04b6d81e |
| https://www.forceracing.in/images/ikr.jpg | 200 | 77536 | 3c8c8ce70a17eb0e3c8dcd8fbebbd2c72aa39448c01323f2ae42beb3148bb69a |
| https://www.forceracing.in/images/kart2.jpg | 200 | 167271 | dc549f61741d0449973c4862b26758c300488f3074ccf6bd827e7737a014d253 |
| https://www.forceracing.in/images/kart1.png | 200 | 263291 | d7c44fc525b11eb3ae63ceae0ebe39d19d512b4abefae0dbff2ca71ec2ec1353 |
| https://www.forceracing.in/images/ratham.jpeg | 200 | 143408 | c529716566053013b41e07ca5304f8d9f7d0b0093dbe864d1f5f154d285e59da |
| https://www.forceracing.in/images/efficycle.jpeg | 200 | 242579 | 71691fed4d852a458e1ed7b70fcab5750d7a1d9dc6dd1250dcfabec138911f39 |
| https://www.forceracing.in/images/phoenix.jpg | 200 | 18345 | d675ad68fbabeec41f1926755def7eb582f1785658add00b9fc4930e623a6def |
| https://www.forceracing.in/images/ashwasena.jpg | 200 | 20824 | 34a7862a83858b2bb28a69afe18a658573e933de2fe6421eca1e0fdb50223986 |
| https://www.forceracing.in/images/baja11.jpg | 200 | 61698 | 253bdcf23edea9bc54da64835db0734620f64f55d2b003a7e84fa8f930f905de |
| https://www.forceracing.in/images/baja10.png | 200 | 929506 | 17b1da8dae4174c69618f9db9256b0268e6b86f1bf6e23475b2ffa738142dff6 |
| https://www.forceracing.in/images/user.jpg | 200 | 9632 | a3663999509c5d371da48e8cbc8b551e12afb9589db1d1f9f1f3aa0610a021bc |

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

