import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import Gallery from '../components/Gallery';
import Partners from '../components/Partners';
import Footer from '../components/Footer';

const Home = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <Gallery />
      <Partners />
      <Footer />
    </div>
  );
};

export default Home;
