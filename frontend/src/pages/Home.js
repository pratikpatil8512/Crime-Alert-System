// src/pages/Home.js
import { useNavigate } from 'react-router-dom';
import { Shield, AlertTriangle, ArrowRight, MapPin, Radio, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-[#f8fafc] via-[#e9f0ff] to-[#f0f4ff] text-gray-900">
      {/* Floating glowing spheres */}
      <motion.div
        className="absolute top-[-10rem] left-[-10rem] w-[25rem] h-[25rem] bg-blue-200/60 blur-[150px] rounded-full"
        animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.1, 1] }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-[-10rem] right-[-10rem] w-[25rem] h-[25rem] bg-cyan-200/70 blur-[150px] rounded-full"
        animate={{ opacity: [0.3, 0.6, 0.3], scale: [1.1, 1.25, 1.1] }}
        transition={{ duration: 10, repeat: Infinity }}
      />

      {/* HERO SECTION */}
      <section className="flex flex-col items-center justify-center text-center py-24 px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          <div className="flex justify-center mb-6">
            <motion.div
              animate={{ y: [0, -12, 0] }}
transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Shield className="text-sky-600 drop-shadow-[0_0_10px_rgba(59,130,246,0.4)]" size={64} />
            </motion.div>
          </div>

          <h1 className="text-5xl md:text-6xl font-extrabold mb-4 leading-tight tracking-tight">
            Intelligent <span className="text-sky-600">Crime</span> Awareness Platform
          </h1>
          <p className="text-gray-600 text-lg md:text-xl max-w-3xl mx-auto mb-10">
            Experience the next generation of <span className="text-sky-500 font-medium">public safety</span>.  
            AI-driven insights, real-time incident tracking, and predictive analytics for a safer world.
          </p>
        </motion.div>

        <motion.div
          className="flex flex-col sm:flex-row gap-4 justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 1 }}
        >
          <button
            onClick={() => navigate('/login')}
            className="group bg-sky-500 hover:bg-sky-600 text-white px-8 py-3 rounded-full flex items-center justify-center space-x-2 font-semibold transition-all duration-300 hover:shadow-[0_0_25px_rgba(56,189,248,0.6)]"
          >
            <span>Get Started</span>
            <ArrowRight className="group-hover:translate-x-1 transition-transform duration-300" size={18} />
          </button>

          <button
            onClick={() => alert('🚀 Coming soon: Smart Crime Analytics Dashboard!')}
            className="group border border-sky-400/80 text-sky-600 hover:text-white hover:bg-sky-500/20 px-8 py-3 rounded-full flex items-center space-x-2 font-semibold transition-all duration-300"
          >
            <AlertTriangle size={18} />
            <span>View Safety Insights</span>
          </button>
        </motion.div>
      </section>

      {/* FEATURES SECTION */}
      <section className="relative z-10 py-20 px-6 md:px-16 bg-white/60 backdrop-blur-xl border-t border-sky-100 shadow-inner">
        <motion.h2
          className="text-3xl md:text-4xl font-bold text-center mb-16 text-gray-800"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          Platform <span className="text-sky-600">Highlights</span>
        </motion.h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
          {[
            {
              icon: <MapPin className="text-sky-600" size={28} />,
              title: 'Geo Crime Mapping',
              desc: 'Visualize ongoing and historical incidents through an interactive AI-enhanced map for smarter navigation.',
            },
            {
              icon: <Radio className="text-sky-600" size={28} />,
              title: 'Instant Alerts',
              desc: 'Stay informed with immediate notifications when suspicious activity occurs in your region.',
            },
            {
              icon: <Activity className="text-sky-600" size={28} />,
              title: 'Predictive Analytics',
              desc: 'Our system analyzes trends to forecast and prevent potential threats in real-time.',
            },
          ].map((feature, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -6, scale: 1.03 }}
              whileInView={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: 40 }}
              transition={{ duration: 0.8, delay: i * 0.2 }}
              className="p-6 bg-white/70 rounded-2xl shadow-md border border-sky-100 hover:shadow-[0_0_25px_rgba(59,130,246,0.2)] transition-all duration-300"
            >
              <div className="flex items-center space-x-3 mb-4">{feature.icon}<h3 className="text-xl font-semibold">{feature.title}</h3></div>
              <p className="text-gray-600">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="py-24 text-center bg-gradient-to-r from-sky-100 to-blue-50 relative z-10">
        <motion.h2
          className="text-4xl md:text-5xl font-bold mb-6 text-gray-800"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          Join the <span className="text-sky-600">Future</span> of Public Safety
        </motion.h2>
        <p className="text-gray-600 max-w-2xl mx-auto mb-8 text-lg">
          Empower your city with real-time data and advanced safety technology.
          Together, we can make every neighborhood safer and smarter.
        </p>

        <motion.button
          onClick={() => navigate('/login')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-gradient-to-r from-sky-500 to-blue-500 px-10 py-4 rounded-full font-semibold text-white shadow-lg hover:shadow-[0_0_35px_rgba(56,189,248,0.4)] transition-all"
        >
          Get Started
        </motion.button>
      </section>

      {/* FOOTER */}
      <footer className="py-6 text-center text-gray-500 text-sm border-t border-sky-100 bg-white/60 backdrop-blur-md">
        © {new Date().getFullYear()} Crime Alert System — Developed by{' '}
        <span className="text-sky-600 font-semibold hover:underline cursor-pointer">
          Pratik and Team
        </span>
      </footer>
    </div>
  );
}
