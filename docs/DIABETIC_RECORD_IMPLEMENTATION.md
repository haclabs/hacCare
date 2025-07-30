# Diabetic Record Module Implementation

## Overview
A comprehensive diabetic patient management system integrated into the MAR (Medication Administration Record) module, providing BBIT (Basal-Bolus Insulin Therapy) support and glucose monitoring.

## Features

### 🩸 Glucose Monitoring
- Blood glucose readings with automatic status classification
- Support for different reading types (AC, PC, HS, AM, PRN)
- Real-time glucose status indicators (Normal, Low, High, Critical)
- Configurable monitoring frequencies

### 💉 Insulin Administration Tracking  
- **Basal Insulin**: Long-acting insulin types (Lantus, Levemir, Tresiba, etc.)
- **Bolus Insulin**: Rapid-acting insulin types (Humalog, NovoLog, Apidra, etc.)
- **Correction Insulin**: Additional rapid-acting doses for glucose correction
- **Other Insulin**: Flexible support for NPH, Regular, and other insulin types
- Injection site tracking and rotation management

### 📊 Clinical Documentation
- Comprehensive treatment notes
- Physician communication logs
- Digital nurse signatures
- Automated timestamping

### 📈 Analytics & Trends
- Glucose trend visualization (72-hour view)
- Time-in-range calculations
- Statistical analysis (averages, min/max, percentages)
- Clinical decision support indicators

## Database Schema

### `diabetic_records` Table
```sql
- id: UUID (Primary Key)
- patient_id: VARCHAR(50) (Foreign Key to patients)
- date: DATE (Record date)
- time_cbg_taken: TIME (Time of glucose measurement)
- reading_type: VARCHAR(10) (AC/PC/HS/AM/PRN)
- glucose_reading: DECIMAL(4,1) (mmol/L, 0-50 range)
- basal_insulin: JSONB (Basal insulin details)
- bolus_insulin: JSONB (Bolus insulin details)  
- correction_insulin: JSONB (Correction insulin details)
- other_insulin: JSONB (Other insulin details)
- treatments_given: TEXT (Clinical notes)
- comments_for_physician: TEXT (Physician communication)
- signature: VARCHAR(255) (Nurse signature)
- prompt_frequency: VARCHAR(10) (Monitoring frequency)
- created_by: UUID (User who created record)
- tenant_id: UUID (Multi-tenant support)
- created_at/updated_at: TIMESTAMP
```

### Insulin JSON Structure
```json
{
  "type": "LANTUS",
  "category": "Basal", 
  "units": 24.0,
  "timeAdministered": "08:00",
  "injectionSite": "Left thigh"
}
```

## Integration Points

### MAR Module Integration
- Added "Diabetic Record" tab to existing MAR navigation
- Seamless patient context sharing
- Unified user authentication

### Authentication & Security
- Row-level security (RLS) policies
- Tenant-based data isolation
- User permission validation
- Audit trail maintenance

## Usage

### Creating a New Record
1. Navigate to MAR Module → Diabetic Record tab
2. Fill in glucose reading and time
3. Add insulin administrations if applicable  
4. Include clinical notes and sign
5. Save record

### Viewing History
- Access recent records with glucose trends
- View statistical summaries
- Filter by date ranges
- Export capabilities

### Trend Analysis
- Visual glucose patterns over time
- Time-in-range calculations
- Clinical decision support
- Alert generation for critical values

## Clinical Standards Compliance

### Glucose Ranges (mmol/L)
- **Critical Low**: < 3.0
- **Low**: 3.0 - 3.9
- **Normal**: 4.0 - 10.0  
- **High**: 10.1 - 15.0
- **Critical High**: > 15.0

### Reading Types
- **AC**: Ante Cibum (Before meals)
- **PC**: Post Cibum (After meals)  
- **HS**: Hour of Sleep (Bedtime)
- **AM**: Morning
- **PRN**: Pro Re Nata (As needed)

### Prompt Frequencies
- Q6H (Every 6 hours)
- Q4H (Every 4 hours) 
- Q2H (Every 2 hours)
- QID (4 times daily)
- TID (3 times daily)
- BID (2 times daily)
- Daily

## Files Created

### Core Components
- `src/types/diabeticRecord.ts` - Type definitions and interfaces
- `src/lib/diabeticRecordService.ts` - Database service layer
- `src/components/DiabeticRecordModule.tsx` - Main UI component

### Database
- `sql-patches/setup/create-diabetic-records-table.sql` - Database schema

### Integration
- Updated `src/modules/mar/MARModule.tsx` - Added diabetic record tab

## Development Status

✅ **Completed**
- Type system and interfaces
- Database schema with RLS policies
- Service layer for CRUD operations
- Basic UI components
- MAR module integration
- Form validation and submission

🚧 **Simplified for Development**
- Using standard HTML elements instead of complex UI library
- Basic trend visualization (chart library not installed)
- Reduced insulin form complexity for initial implementation

## Next Steps

1. **Enhanced UI Components**: Implement full UI library (recharts, shadcn/ui)
2. **Chart Integration**: Add proper glucose trend visualization
3. **Advanced Analytics**: Implement HbA1c estimates and pattern recognition
4. **Mobile Support**: Responsive design optimization
5. **Print/Export**: PDF generation for clinical records
6. **Integration**: Connect with existing patient medication lists

## Technical Notes

- Built with React/TypeScript for type safety
- Supabase backend with PostgreSQL
- Tailwind CSS for styling
- Multi-tenant architecture support
- Row-level security implementation
- Real-time updates capability

This implementation provides a solid foundation for comprehensive diabetic patient management within the existing healthcare system architecture.
