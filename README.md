# hacCare - Hospital Patient Record System

A comprehensive, secure hospital management system designed for healthcare professionals to manage patient records, vital signs, medications, and assessments efficiently.

## 🏥 Features

### Patient Management
- **Patient Records**: Complete patient information with demographics, medical history, and emergency contacts
- **Patient ID Labels**: Generate Avery 5160 compatible labels for patient identification
- **Room & Bed Tracking**: Real-time patient location management

### Vital Signs & Assessments
- **Vital Signs Monitoring**: Temperature, blood pressure, heart rate, respiratory rate, and oxygen saturation
- **Trend Analysis**: Interactive charts showing vital signs history and patterns
- **Wound Assessment**: Interactive body diagrams for documenting wound locations and progress
- **Assessment Tabs**: Organized sections for different types of patient assessments

### Medication Management
- **Medication Tracking**: Active medications with dosages, frequencies, and administration routes
- **Medication Labels**: Generate labels for medication containers with barcodes
- **Due Time Alerts**: Automated alerts for upcoming medication administrations
- **Prescription History**: Complete medication history and prescriber information

### User Management & Security
- **Role-Based Access Control**: Nurse, Admin, and Super Admin roles with appropriate permissions
- **User Profiles**: Comprehensive user management with department assignments
- **Secure Authentication**: Supabase-powered authentication with session management
- **Activity Logging**: Track user actions and system changes

### Alerts & Notifications
- **Real-Time Alerts**: Critical patient conditions, medication due times, and vital sign abnormalities
- **Priority System**: Color-coded alerts based on urgency (Critical, High, Medium, Low)
- **Alert Management**: Acknowledge and track alert resolution

## 🚀 Technology Stack

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS for responsive design
- **Icons**: Lucide React for consistent iconography
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Authentication**: Supabase Auth with role-based access control
- **Build Tool**: Vite for fast development and building
- **Date Handling**: date-fns for date manipulation and formatting

## 🔒 Data Storage & Security

**Important**: This application uses **ONLY Supabase** for data persistence and session management. 

- ✅ **All user data** is stored in Supabase PostgreSQL database
- ✅ **Authentication sessions** are managed by Supabase Auth
- ✅ **User profiles and preferences** are stored in Supabase tables
- ✅ **Patient records and medical data** are stored securely in Supabase
- ❌ **No localStorage or sessionStorage** is used for application data
- ❌ **No client-side data persistence** beyond temporary UI state

### Security Features
- **Row Level Security (RLS)**: Database-level security policies
- **Role-Based Access Control**: Different permissions for nurses, admins, and super admins
- **Session Management**: Automatic session refresh and timeout handling via Supabase
- **Input Validation**: Client and server-side validation
- **Secure Authentication**: Supabase Auth with PKCE flow
- **Function Search Path Security**: Immutable search paths to prevent SQL injection

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Modern web browser (Chrome, Firefox, Safari, Edge)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/haccare-hospital-system.git
   cd haccare-hospital-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up Supabase database**
   - Create a new Supabase project
   - Run the database migrations (if available)
   - Set up Row Level Security policies
   - Create demo user accounts for testing

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   Open your browser and navigate to `http://localhost:5173`

## 🔐 Demo Accounts

The system includes demo accounts for testing:

- **Super Admin**: admin@haccare.com / admin123
- **Nurse**: nurse@haccare.com / nurse123

## 🏗️ Project Structure

```
src/
├── components/           # React components
│   ├── Auth/            # Authentication components
│   ├── Alerts/          # Alert and notification components
│   ├── Dashboard/       # Dashboard and statistics
│   ├── Layout/          # Header, sidebar, and layout components
│   ├── Patients/        # Patient management components
│   ├── Users/           # User management components
│   └── UI/              # Reusable UI components
├── contexts/            # React contexts (Auth, Patient)
├── data/               # Mock data and constants
├── lib/                # External library configurations (Supabase)
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── main.tsx            # Application entry point
```

## 🔧 Configuration

### Environment Variables
- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key

### Supabase Setup
1. Create user_profiles table with appropriate columns
2. Set up Row Level Security policies
3. Create user roles enum (nurse, admin, super_admin)
4. Configure authentication settings
5. Enable security features:
   - Leaked password protection
   - Multi-factor authentication options

## 🧪 Development

### Available Scripts
- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run preview`: Preview production build
- `npm run lint`: Run ESLint

### Security Best Practices
- Use immutable search paths in all database functions
- Implement proper Row Level Security policies
- Enable leaked password protection
- Configure multi-factor authentication
- Validate all user inputs
- Use prepared statements for database queries
- Implement proper error handling

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Contact the development team
- Check the documentation and changelog

## 🔄 Changelog

See [CHANGELOG.md](CHANGELOG.md) for a detailed history of changes and updates.

---

**hacCare** - Empowering healthcare professionals with modern, secure, and efficient patient management tools powered by Supabase.