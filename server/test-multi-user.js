const API_URL = 'http://localhost:3001/api';

async function runTest() {
    try {
        console.log('--- Testing Multi-User Support ---');

        // 1. Register User A
        console.log('Registering User A...');
        const resRegA = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'User A', email: 'usera@example.com', password: 'password123' })
        });
        const regA = await resRegA.json();
        console.log('User A registration response:', regA.message);

        // 2. Login User A
        console.log('Logging in User A...');
        const resLoginA = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'usera@example.com', password: 'password123' })
        });
        const loginA = await resLoginA.json();
        const tokenA = loginA.token;
        console.log('User A logged in.');

        // 3. Register User B
        console.log('Registering User B...');
        await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'User B', email: 'userb@example.com', password: 'password123' })
        });
        console.log('User B registered.');

        // 4. Login User B
        console.log('Logging in User B...');
        const resLoginB = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'userb@example.com', password: 'password123' })
        });
        const loginB = await resLoginB.json();
        const tokenB = loginB.token;
        console.log('User B logged in.');

        // 5. User A adds Knowledge Base entry
        console.log('User A adding Knowledge Base entry...');
        await fetch(`${API_URL}/knowledge-base`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tokenA}`
            },
            body: JSON.stringify({ key: 'Secret A', value: 'Value A' })
        });

        // 6. User B adds Knowledge Base entry
        console.log('User B adding Knowledge Base entry...');
        await fetch(`${API_URL}/knowledge-base`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tokenB}`
            },
            body: JSON.stringify({ key: 'Secret B', value: 'Value B' })
        });

        // 7. Verify Isolation
        console.log('Verifying isolation...');
        const resKBA = await fetch(`${API_URL}/knowledge-base`, {
            headers: { 'Authorization': `Bearer ${tokenA}` }
        });
        const kbA = await resKBA.json();

        const resKBB = await fetch(`${API_URL}/knowledge-base`, {
            headers: { 'Authorization': `Bearer ${tokenB}` }
        });
        const kbB = await resKBB.json();

        console.log('User A KB:', kbA);
        console.log('User B KB:', kbB);

        if (kbA.length === 1 && kbA[0].key === 'Secret A' &&
            kbB.length === 1 && kbB[0].key === 'Secret B') {
            console.log('SUCCESS: Data isolation verified!');
        } else {
            console.error('FAILURE: Data isolation failed!');
        }

    } catch (error) {
        console.error('Test failed:', error.message);
    }
}

runTest();
