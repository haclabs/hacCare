const { supabase } = require('../../src/lib/supabase.js');

async function checkAndCreateTenant() {
  try {
    console.log('🔍 Checking existing tenants...');
    
    const { data, error } = await supabase
      .from('tenants')
      .select('id, name, subdomain, status');
      
    if (error) {
      console.error('❌ Error fetching tenants:', error);
      return;
    }
    
    console.log('📊 Found tenants:', data);
    
    // Check if lethpoly exists
    const lethpoly = data.find(t => t.subdomain === 'lethpoly');
    if (!lethpoly) {
      console.log('🏗️ Creating lethpoly tenant...');
      const { data: newTenant, error: createError } = await supabase
        .from('tenants')
        .insert([{
          name: 'Lethbridge Polytechnic',
          subdomain: 'lethpoly',
          status: 'active',
          settings: {
            primary_color: '#1e40af',
            logo_url: null
          }
        }])
        .select();
        
      if (createError) {
        console.error('❌ Create error:', createError);
      } else {
        console.log('✅ Created tenant:', newTenant[0]);
      }
    } else {
      console.log('✅ Lethpoly tenant already exists:', lethpoly);
    }
  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

checkAndCreateTenant();
