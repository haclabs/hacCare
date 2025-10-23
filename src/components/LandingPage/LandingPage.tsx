import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, BookOpen, Users, Shield, Mail, Phone, MapPin } from 'lucide-react';
import logo from './logo.png';
import { submitContactForm } from '../../services/contact/contactService';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  
  // Contact form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    institution: '',
    message: '',
  });
  const [formStatus, setFormStatus] = useState<{
    type: 'idle' | 'loading' | 'success' | 'error';
    message?: string;
  }>({ type: 'idle' });

  // Add structured data for SEO
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "hacCare",
      "applicationCategory": "EducationalApplication",
      "operatingSystem": "Web",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      },
      "description": "A comprehensive platform built to prepare future healthcare providers. Learners engage with a high-fidelity electronic medical record (EMR) in a safe, simulated space that mirrors real clinical practice.",
      "provider": {
        "@type": "Organization",
        "name": "halabs",
        "url": "https://haccare.app"
      },
      "featureList": [
        "BCMA Integration",
        "Clinical Documentation",
        "Smart Alert System",
        "Specialized Care Modules",
        "Canadian Readings",
        "Interactive Debriefing"
      ],
      "screenshot": "https://haccare.app/images/barcode_med_admin.jpg",
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "5.0",
        "ratingCount": "1"
      }
    });
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  // Handle form input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  // Handle form submission
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormStatus({ type: 'loading' });

    const result = await submitContactForm(formData);

    if (result.success) {
      setFormStatus({
        type: 'success',
        message: result.message || 'Thank you! We\'ll get back to you soon.',
      });
      // Reset form
      setFormData({ name: '', email: '', institution: '', message: '' });
      // Clear success message after 5 seconds
      setTimeout(() => setFormStatus({ type: 'idle' }), 5000);
    } else {
      setFormStatus({
        type: 'error',
        message: result.error || 'Failed to send message. Please try again.',
      });
    }
  };

  const features = [
    {
      icon: Heart,
      title: "Patient-Centered Care",
      description: "Deliver holistic, patient-focused training with tools for real-time assessment monitoring, trend tracking, medication administration, documentation, and complete medical histories all in one place."
    },
    {
      icon: BookOpen,
      title: "Realistic Clinical Scenarios",
      description: "Easily create customized patient cases by uploading patient info, labs, orders, and medications to fit any simulation. Real-time alerts keep learners informed of critical values and outstanding orders, fostering clinical judgment and timely action."
    },
    {
      icon: Users,
      title: "Collaborative Learning",
      description: "Multi-user support with role-based access enables team-based learning experiences that mirror real clinical workflows."
    },
    {
      icon: Shield,
      title: "Safe Training Environment",
      description: "Students practice using realistic electronic medication administration records without risk to real patients or data. The system is designed by healthcare professionals to provide authentic, hands-on experience in a secure environment."
    }
  ];

  const capabilities = [
    {
      title: "BCMA Integration",
      description: "Barcode-driven medication administration with medication rights verification ensures medication safety and regulatory compliance."
    },
    {
      title: "Clinical Documentation",
      description: "Full charting capabilities, including wound assessments, admission processing, diabetic care, and advanced directives."
    },
    {
      title: "Smart Alert System",
      description: "Real-time monitoring with intelligent notifications for vital signs, medications due, and critical patient status changes."
    },
    {
      title: "Specialized Care Modules",
      description: "Dedicated tools for diabetic management, glucose monitoring, insulin tracking, and comprehensive medication administration records."
    },
    {
      title: "Canadian Readings",
      description: "Configured with Canadian units for seamless integration into Canadian healthcare education programs."
    },
    {
      title: "Interactive Debriefing",
      description: "Instructors can review every learner intervention post-simulation, give timely feedback, and support meaningful reflection."
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
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Simulated EMR &<br />Training Environment
            </h1>
            <p className="text-xl text-gray-600 mb-10">
              A comprehensive platform built to prepare future healthcare providers. Learners engage with a high-fidelity electronic medical record (EMR) in a safe, simulated space that mirrors real clinical practice.
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
          </div>
          <div className="relative">
            <img 
              src="/images/barcode-scanning.jpg" 
              alt="Healthcare professional using barcode scanning with EMR system" 
              className="rounded-2xl shadow-2xl w-full"
            />
          </div>
        </div>
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
              hacCare provides future healthcare professionals with hands-on experience using a realistic electronic medical record system. Built with modern technology and designed by healthcare professionals, our platform bridges the gap between classroom learning and clinical practice.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <img 
                src="/images/nurse-scanning.jpg" 
                alt="Nurse scanning patient wristband with laptop EMR system" 
                className="rounded-2xl shadow-lg w-full"
              />
            </div>
            <div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">Purpose-Built for Learning</h3>
              <p className="text-gray-600 mb-4">
                Our easy to navigate platform replicates real-world electronic health record systems, allowing learners to develop competency in medication administration, documentation, and clinical workflows before entering actual healthcare settings.
              </p>
              <p className="text-gray-600">
                With features like barcode scanning medication administration, medication rights verification, and comprehensive patient charting, students gain practical experience with the tools they will use throughout their careers.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-12 mt-16">
            <div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">Modern Technology Stack</h3>
              <p className="text-gray-600 mb-4">
                Built with React, TypeScript, and Supabase, hacCare leverages enterprise-grade technology to deliver a responsive, real-time learning experience. The platform includes mobile-first design, real-time data synchronization, and advanced security features.
              </p>
              <p className="text-gray-600">
                Our commitment to security and compliance ensures data is protected while providing an authentic healthcare technology experience.
              </p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8">
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">Key Benefits</h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-white text-sm">✓</span>
                  </div>
                  <span className="text-gray-700">Real-time clinical decision making</span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-white text-sm">✓</span>
                  </div>
                  <span className="text-gray-700">Barcode scanning integration</span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-white text-sm">✓</span>
                  </div>
                  <span className="text-gray-700">Medication rights verification</span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-white text-sm">✓</span>
                  </div>
                  <span className="text-gray-700">Post-simulation debriefing tools</span>
                </li>
              </ul>
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
              Everything healthcare professionals need to practice and master electronic medical record systems.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
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

          {/* BCMA Showcase */}
          <div className="mt-16 bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl p-12">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">
                  Barcode Medication Administration
                </h3>
                <p className="text-lg text-gray-600 mb-6">
                  Experience realistic BCMA workflows with our comprehensive medication administration record system. Scan medications, verify patient identity, and document administration with the same tools used in real healthcare settings.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                      <span className="text-white text-sm">✓</span>
                    </div>
                    <span className="text-gray-700">PRN (As Needed) and Scheduled Medications</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                      <span className="text-white text-sm">✓</span>
                    </div>
                    <span className="text-gray-700">Real-time status tracking (Scheduled, Overdue, Administered)</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                      <span className="text-white text-sm">✓</span>
                    </div>
                    <span className="text-gray-700">Complete medication details with dosage and prescriber info</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                      <span className="text-white text-sm">✓</span>
                    </div>
                    <span className="text-gray-700">Give PRN, Edit, and Delete functionality for realistic training</span>
                  </li>
                </ul>
              </div>
              <div>
                <img 
                  src="/images/barcode_med_admin.jpg" 
                  alt="BCMA Medication Administration Record interface showing scheduled medications" 
                  className="rounded-xl shadow-2xl w-full border-4 border-white"
                />
              </div>
            </div>
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

            <form className="space-y-6" onSubmit={handleContactSubmit}>
              {formStatus.type === 'success' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 text-sm">{formStatus.message}</p>
                </div>
              )}
              
              {formStatus.type === 'error' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 text-sm">{formStatus.message}</p>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    disabled={formStatus.type === 'loading'}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    disabled={formStatus.type === 'loading'}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                  value={formData.institution}
                  onChange={handleInputChange}
                  disabled={formStatus.type === 'loading'}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="Your institution name"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="message"
                  rows={6}
                  value={formData.message}
                  onChange={handleInputChange}
                  required
                  disabled={formStatus.type === 'loading'}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="Tell us about your needs..."
                />
              </div>

              <button
                type="submit"
                disabled={formStatus.type === 'loading'}
                className="w-full text-white px-6 py-3 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: formStatus.type === 'loading' ? '#9CA3AF' : '#19ADF2' }}
                onMouseEnter={(e) => {
                  if (formStatus.type !== 'loading') {
                    e.currentTarget.style.backgroundColor = '#1598D6';
                  }
                }}
                onMouseLeave={(e) => {
                  if (formStatus.type !== 'loading') {
                    e.currentTarget.style.backgroundColor = '#19ADF2';
                  }
                }}
              >
                {formStatus.type === 'loading' ? 'Sending...' : 'Send Message'}
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
