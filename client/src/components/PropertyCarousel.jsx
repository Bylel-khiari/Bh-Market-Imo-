import React from 'react';
import Slider from 'react-slick';
import { FaMapMarkerAlt, FaBed, FaBath, FaArrowsAlt } from 'react-icons/fa';
import '../styles/PropertyCarousel.css';

const PropertyCarousel = () => {
  const properties = [
    {
      id: 1,
      title: 'Appartement luxueux',
      location: 'Les Berges du Lac, Tunis',
      price: '450 000 DT',
      rooms: 4,
      baths: 3,
      area: '180 m²',
      image: 'https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=500'
    },
    {
      id: 2,
      title: 'Villa avec piscine',
      location: 'Gammarth, Tunis',
      price: '850 000 DT',
      rooms: 6,
      baths: 4,
      area: '350 m²',
      image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=500'
    },
    {
      id: 3,
      title: 'Appartement moderne',
      location: 'Ennasr, Ariana',
      price: '320 000 DT',
      rooms: 3,
      baths: 2,
      area: '120 m²',
      image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=500'
    },
    {
      id: 4,
      title: 'Bureau commercial',
      location: 'Centre Urbain Nord, Tunis',
      price: '280 000 DT',
      rooms: 2,
      baths: 2,
      area: '100 m²',
      image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=500'
    }
  ];

  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 3,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1,
        }
      },
      {
        breakpoint: 600,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1
        }
      }
    ]
  };

  return (
    <section className="properties-section">
      <div className="container">
        <h2 className="section-title">Biens immobiliers à la une</h2>
        <Slider {...settings}>
          {properties.map(property => (
            <div key={property.id} className="property-card-wrapper">
              <div className="property-card">
                <div className="property-image">
                  <img src={property.image} alt={property.title} />
                  <span className="property-price">{property.price}</span>
                </div>
                <div className="property-info">
                  <h3>{property.title}</h3>
                  <p className="property-location">
                    <FaMapMarkerAlt /> {property.location}
                  </p>
                  <div className="property-features">
                    <span><FaBed /> {property.rooms} ch</span>
                    <span><FaBath /> {property.baths} sdb</span>
                    <span><FaArrowsAlt /> {property.area}</span>
                  </div>
                  <button className="btn btn-primary">Voir détails</button>
                </div>
              </div>
            </div>
          ))}
        </Slider>
      </div>
    </section>
  );
};

export default PropertyCarousel;
