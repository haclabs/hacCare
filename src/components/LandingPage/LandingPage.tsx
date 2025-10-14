import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, BookOpen, Users, Shield, Mail, Phone, MapPin } from 'lucide-react';
import logo from './logo.png';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Heart,
      title: "Patient-Centered Care",
      description: "Comprehensive patient management with real-time vital signs monitoring, medication tracking, and complete medical history documentation."
    },
    {
      icon: BookOpen,
      title: "Realistic Clinical Scenarios",
      description: "Practice with authentic electronic medication administration records in a safe, simulated environment designed for healthcare education."
    },
    {
      icon: Users,
      title: "Collaborative Learning",
      description: "Multi-user support with role-based access enables team-based learning experiences that mirror real clinical workflows."
    },
    {
      icon: Shield,
      title: "Safe Training Environment",
      description: "HIPAA-compliant platform with enterprise-grade security, allowing students to learn without risk to actual patient data."
    }
  ];

  const capabilities = [
    {
      title: "BCMA Integration",
      description: "Barcode-driven medication administration with Five Rights verification ensures medication safety and regulatory compliance."
    },
    {
      title: "Clinical Documentation",
      description: "Complete charting system including wound assessments, admission processing, diabetic care management, and advanced directives."
    },
    {
      title: "Smart Alert System",
      description: "Real-time monitoring with intelligent notifications for vital signs, medications due, and critical patient status changes."
    },
    {
      title: "Specialized Care Modules",
      description: "Dedicated tools for diabetic management, glucose monitoring, insulin tracking, and comprehensive medication administration records."
    }
  ];

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <img src={logo} alt="HacCare" className="h-12 w-auto" />
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-8">
              <button
                onClick={() => scrollToSection('about')}
                className="text-gray-600 hover:text-blue-600 transition-colors font-medium"
              >
                About
              </button>
              <button
                onClick={() => scrollToSection('features')}
                className="text-gray-600 hover:text-blue-600 transition-colors font-medium"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection('contact')}
                className="text-gray-600 hover:text-blue-600 transition-colors font-medium"
              >
                Contact
              </button>
              <button
                onClick={() => navigate('/login')}
                className="transition-colors font-medium"
                style={{ color: '#19ADF2' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#1598D6'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#19ADF2'}
              >
                Login
              </button>
              <button
                onClick={() => navigate('/login')}
                className="text-white px-6 py-2 rounded-lg transition-colors font-medium"
                style={{ backgroundColor: '#19ADF2' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1598D6'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#19ADF2'}
              >
                Get Started
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={() => navigate('/login')}
                className="text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm"
                style={{ backgroundColor: '#19ADF2' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1598D6'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#19ADF2'}
              >
                Login
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
          Simulated EMR &<br />Training Environment
        </h1>
        <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto">
          A comprehensive platform designed for healthcare students to practice electronic medication administration records in a safe, simulated environment.
        </p>
        <button
          onClick={() => navigate('/login')}
          className="text-white px-8 py-4 rounded-lg transition-colors font-medium text-lg inline-flex items-center"
          style={{ backgroundColor: '#19ADF2' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1598D6'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#19ADF2'}
        >
          Start Learning Today
        </button>
      </section>

      {/* Feature Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <feature.icon className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600 text-sm">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Healthcare Education Reimagined
            </h2>
            <p className="text-lg text-gray-600">
              HacCare provides healthcare students with hands-on experience using a realistic electronic medical record system. Built with modern technology and designed by healthcare professionals, our platform bridges the gap between classroom learning and clinical practice.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">Purpose-Built for Learning</h3>
              <p className="text-gray-600 mb-4">
                Our platform replicates real-world electronic health record systems, allowing students to develop competency in medication administration, patient documentation, and clinical workflows before entering actual healthcare settings.
              </p>
              <p className="text-gray-600">
                With features like barcode medication administration, Five Rights verification, and comprehensive patient charting, students gain practical experience with the tools they will use throughout their careers.
              </p>
            </div>
            <div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">Modern Technology Stack</h3>
              <p className="text-gray-600 mb-4">
                Built with React, TypeScript, and Supabase, HacCare leverages enterprise-grade technology to deliver a responsive, real-time learning experience. The platform includes mobile-first design, real-time data synchronization, and advanced security features.
              </p>
              <p className="text-gray-600">
                Our commitment to security and compliance ensures student data is protected while providing an authentic healthcare technology experience.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Comprehensive Feature Set
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Everything healthcare students need to practice and master electronic medical record systems.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {capabilities.map((capability, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow"
              >
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {capability.title}
                </h3>
                <p className="text-gray-600">
                  {capability.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-16 rounded-2xl p-12 text-center text-white" style={{ backgroundColor: '#19ADF2' }}>
            <h3 className="text-3xl font-bold mb-4">
              Additional Clinical Tools
            </h3>
            <div className="grid md:grid-cols-3 gap-8 mt-8 text-left">
              <div>
                <h4 className="font-semibold mb-2">Patient Management</h4>
                <p className="text-blue-100 text-sm">
                  Complete profiles with demographics, medical history, allergies, and emergency contacts.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Vital Signs Monitoring</h4>
                <p className="text-blue-100 text-sm">
                  Real-time tracking with automated alert thresholds and trend analysis.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Analytics Dashboard</h4>
                <p className="text-blue-100 text-sm">
                  Patient statistics, medication compliance, and comprehensive audit trails.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Get In Touch
              </h2>
              <p className="text-lg text-gray-600">
                Have questions about HacCare? We'd love to hear from you.
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-8 mb-8">
              <div className="grid md:grid-cols-3 gap-6 text-center">
                <div>
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-3">
                    <Mail className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">Email</h3>
                  <p className="text-gray-600 text-sm">info@haccare.app</p>
                </div>
                <div>
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-3">
                    <Phone className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">Phone</h3>
                  <p className="text-gray-600 text-sm">Available upon request</p>
                </div>
                <div>
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-3">
                    <MapPin className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">Location</h3>
                  <p className="text-gray-600 text-sm">Remote Support</p>
                </div>
              </div>
            </div>

            <form className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="institution" className="block text-sm font-medium text-gray-700 mb-2">
                  Institution / Organization
                </label>
                <input
                  type="text"
                  id="institution"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Your institution name"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  id="message"
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Tell us about your needs..."
                />
              </div>

              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="captcha"
                  className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="captcha" className="ml-2 text-sm text-gray-600">
                  I'm not a robot (CAPTCHA verification will be enabled soon)
                </label>
              </div>

              <button
                type="button"
                onClick={() => alert('Contact form submission will be enabled soon. Please email info@haccare.app directly.')}
                className="w-full text-white px-6 py-3 rounded-lg transition-colors font-medium"
                style={{ backgroundColor: '#19ADF2' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1598D6'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#19ADF2'}
              >
                Send Message
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <img src={logo} alt="HacCare" className="h-10 w-auto mb-4 brightness-0 invert" />
              <p className="text-sm">
                Professional healthcare training software for the next generation of medical professionals.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4">Quick Links</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <button onClick={() => scrollToSection('about')} className="hover:text-white transition-colors">
                    About
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('features')} className="hover:text-white transition-colors">
                    Features
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/login')} className="hover:text-white transition-colors">
                    Login
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4">Resources</h3>
              <ul className="space-y-2 text-sm">

                <li>
                  <button onClick={() => scrollToSection('contact')} className="hover:text-white transition-colors">
                    Contact Support
                  </button>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
            <p>&copy; 2025 hacCare. A halabs product. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
