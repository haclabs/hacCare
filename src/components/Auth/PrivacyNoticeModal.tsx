import React from 'react';
import { X, Shield } from 'lucide-react';

interface PrivacyNoticeModalProps {
  onClose: () => void;
}

export const PrivacyNoticeModal: React.FC<PrivacyNoticeModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <Shield className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-bold text-gray-900 flex-1">Privacy Notice</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5 text-sm text-gray-700 leading-relaxed">

          <p className="text-xs text-gray-500">
            Last updated: April 2026 &nbsp;|&nbsp; Applies to: hacCare EMR Simulation
          </p>

          {/* Section 1 */}
          <section>
            <h3 className="font-semibold text-gray-900 mb-2">1. Who We Are</h3>
            <p>
              hacCare EMR Simulation is a healthcare simulation platform developed and operated by{' '}
              <span className="font-medium">haclabs Inc.</span> and used by post-secondary institutions
              for clinical education and training. This notice explains what personal information we collect,
              why we collect it, and how it is protected.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h3 className="font-semibold text-gray-900 mb-2">2. What Information We Collect</h3>
            <ul className="space-y-1 list-disc list-inside">
              <li><span className="font-medium">Account information:</span> Name, institutional email address, assigned role (instructor, student, etc.)</li>
              <li><span className="font-medium">Simulation activity:</span> Clinical entries made during simulation sessions (vitals, medications, lab orders, assessments, notes) attributed to a student name</li>
              <li><span className="font-medium">Session data:</span> Login timestamps and session activity for security and audit purposes</li>
              <li><span className="font-medium">Simulated patient data:</span> All patient records in the platform are <span className="font-semibold">fictional</span> and created for educational purposes — no real patient health information is collected or stored</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section>
            <h3 className="font-semibold text-gray-900 mb-2">3. How We Use Your Information</h3>
            <ul className="space-y-1 list-disc list-inside">
              <li>To provide access to simulation sessions assigned by your institution</li>
              <li>To generate debrief reports showing clinical activity for educational assessment</li>
              <li>To maintain security, detect unauthorized access, and support audit requirements</li>
              <li>To allow instructors and program coordinators to review student performance within their assigned program</li>
            </ul>
            <p className="mt-2">
              We do not use your information for marketing, advertising, or any purpose unrelated to the
              delivery of clinical simulation education.
            </p>
          </section>

          {/* Section 4 */}
          <section>
            <h3 className="font-semibold text-gray-900 mb-2">4. Who Can See Your Information</h3>
            <ul className="space-y-1 list-disc list-inside">
              <li><span className="font-medium">Your instructor:</span> Can view debrief reports from simulations they ran</li>
              <li><span className="font-medium">Program coordinators and administrators:</span> Can view activity within their institution's programs</li>
              <li><span className="font-medium">Other students:</span> Cannot view your records</li>
              <li><span className="font-medium">haclabs Inc. staff:</span> May access data for technical support and system maintenance, subject to confidentiality obligations</li>
            </ul>
            <p className="mt-2">
              We do not sell, rent, or share your personal information with third parties except as required
              by law or to operate the platform (e.g., Supabase for secure database hosting and Netlify
              for application hosting — both SOC 2 certified and operating in Canadian data centres).
            </p>
          </section>

          {/* Section 5 */}
          <section>
            <h3 className="font-semibold text-gray-900 mb-2">5. Data Storage and Security</h3>
            <ul className="space-y-1 list-disc list-inside">
              <li>All data is encrypted at rest and in transit using industry-standard TLS/AES-256</li>
              <li>Access is enforced through row-level security — users can only access data within their assigned tenants</li>
              <li><span className="font-medium">Database hosting:</span> Supabase (SOC 2 Type II certified, Canadian data centre)</li>
              <li><span className="font-medium">Application hosting:</span> Netlify (SOC 2 Type II certified, Canadian data centre)</li>
              <li><span className="font-medium">Code security:</span> Continuous vulnerability scanning via Snyk to identify and remediate security issues in dependencies and application code</li>
              <li>Audit logs are maintained for security events and access to sensitive data</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section>
            <h3 className="font-semibold text-gray-900 mb-2">6. Data Retention</h3>
            <p>
              Simulation debrief records are retained for the duration of the academic term and
              removed upon account deprovisioning by your institution's administrator. If you believe
              your data has not been removed after your program ends, contact your institution's
              coordinator or reach out to us directly.
            </p>
          </section>

          {/* Section 7 */}
          <section>
            <h3 className="font-semibold text-gray-900 mb-2">7. Your Rights</h3>
            <p className="mb-2">
              Depending on your jurisdiction, you may have rights to:
            </p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of your account and associated records</li>
            </ul>
            <p className="mt-2">
              To exercise these rights, contact your institutional administrator or email us at the
              address below. We will respond within 30 days.
            </p>
          </section>

          {/* Section 8 */}
          <section>
            <h3 className="font-semibold text-gray-900 mb-2">8. Applicable Laws</h3>
            <p>
              This platform is operated in compliance with Canada's <span className="font-medium">Personal Information
              Protection and Electronic Documents Act (PIPEDA)</span> and applicable provincial privacy
              legislation. For institutions in the United States, we support compliance with
              <span className="font-medium"> FERPA</span> by restricting student record access to instructors
              and administrators with a legitimate educational interest. This platform does not process
              real patient health information and is therefore not subject to HIPAA.
            </p>
          </section>

          {/* Section 9 */}
          <section>
            <h3 className="font-semibold text-gray-900 mb-2">9. Contact</h3>
            <p>
              For privacy-related questions or requests, contact:<br />
              <span className="font-medium">haclabs Inc.</span><br />
              <a href="mailto:privacy@haclabs.io" className="text-blue-600 hover:underline">privacy@haclabs.io</a>
            </p>
          </section>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-xs text-amber-800">
            <strong>Simulation Disclaimer:</strong> All patient records, clinical scenarios, and medical data
            within hacCare EMR Simulation are entirely fictional and created for educational purposes only.
            No real patient health information is ever entered into or stored in this platform.
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
