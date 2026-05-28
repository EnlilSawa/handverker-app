import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ldsgjkqjhnxttxnfggfu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxkc2dqa3FqaG54dHR4bmZnZ2Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5Njc1MTMsImV4cCI6MjA5NTU0MzUxM30.eEdOxV1pAl21syRo_3vEmrhZDOtZAigkwQ9AhqItQtg'
);

const COMPANY_ID = '00000000-0000-0000-0000-000000000001';
const PASSWORD = 'Demo1234!';

const users = [
  { email: 'kjetil@vvsservice.no', name: 'Kjetil Hansen', phone: '90000001', role: 'admin' },
  { email: 'magnus@vvsservice.no', name: 'Magnus Olsen',  phone: '90000002', role: 'technician' },
  { email: 'erik@vvsservice.no',   name: 'Erik Berg',     phone: '90000003', role: 'technician' },
  { email: 'lars@vvsservice.no',   name: 'Lars Johansen', phone: '90000004', role: 'technician' },
];

console.log('Oppretter brukere via Supabase Auth...\n');

for (const u of users) {
  const { data, error } = await supabase.auth.signUp({
    email: u.email,
    password: PASSWORD,
    options: {
      data: { name: u.name, phone: u.phone, role: u.role, company_id: COMPANY_ID },
    },
  });

  if (error) {
    console.log(`❌ ${u.email}: ${error.message}`);
  } else {
    console.log(`✅ ${u.email} — id: ${data.user?.id}`);
  }

  await new Promise(r => setTimeout(r, 500));
}

console.log('\nFerdig! Sjekk Authentication > Users i Supabase-dashboardet.');
