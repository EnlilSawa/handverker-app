DELETE FROM invoices WHERE company_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM jobs WHERE company_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM profiles WHERE company_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM auth.users WHERE email IN ('kjetil@vvsservice.no','magnus@vvsservice.no','erik@vvsservice.no','lars@vvsservice.no');
