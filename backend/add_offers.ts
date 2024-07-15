import offers from './models/offers';

async function addOffer(id: string, link: string) {
    try {
      const newOffer = new offers({
        id: id,
        link: link
      });
  
      const savedOffer = await newOffer.save();
      console.log('Offer added:', savedOffer);
    } catch (error) {
      console.error('Error adding user:', error);
    }
}


const offers_dict = {
"15693511113": "https://allegro.pl/oferta/perfumy-z-mocnymi-feromonami-ocean-odyssey-meskie-feromony-oryginalne-15693511113",
"15691819473": "https://allegro.pl/oferta/perfumy-z-mocnymi-feromonami-old-money-desire-damskie-feromony-oryginalne-15691819473",
"15181949512": "https://allegro.pl/oferta/grizzly-formula-potencja-erekcja-libido-prawidlowy-poziom-testosteronu-15181949512",
"15181807818": "https://allegro.pl/oferta/tripanax-potencja-erekcja-libido-zen-szen-koreanski-i-buzdyganek-naziemny-15181807818",
"15134189726": "https://allegro.pl/oferta/perfumy-mocne-feromony-timeless-gentleman-meskie-oryginalne-15134189726",
"14306319766": "https://allegro.pl/oferta/complex-potency-men-potencja-energia-libido-erekcja-poziom-testosteronu-14306319766",
"13565697760": "https://allegro.pl/oferta/libizon-potencja-libido-pozadanie-erekcja-poziom-testosteronu-13565697760",
"13564594738": "https://allegro.pl/oferta/getmen-potencja-erekcja-libido-pozadanie-poziom-testosteronu-13564594738"
}

for (const offer in offers_dict) {
addOffer(offer, offers_dict[offer as keyof typeof offers_dict])
}