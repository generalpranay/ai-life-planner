const API_URL = 'http://127.0.0.1:4000/api';
const USER = { email: 'test@test.com', password: '123456' };

async function post(url, body, token, method = 'POST') {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: method,
        headers: headers,
        body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
}

async function runTest() {
    console.log('--- Starting Test ---');
    try {
        const loginRes = await post(`${API_URL}/auth/login`, USER);
        if (loginRes.status !== 200) return console.log('Login failed', loginRes.status);
        const token = loginRes.data.token;
        console.log('Login successful');

        console.log('Clearing old schedule...');
        await fetch(`${API_URL}/schedule/clear`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });

        const now = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(now.getDate() + 7);

        const tasks = [
            // Recurring Work (9 AM - 5 PM)
            {
                title: 'Software Development Job',
                description: 'Core working hours',
                category: 'work',
                priority: 5,
                is_recurring: true,
                recurrence_days: 'Mon,Tue,Wed,Thu,Fri',
                start_time: '09:00',
                end_time: '17:00'
            },
            // Recurring Gym (6 AM - 7 AM)
            {
                title: 'Morning Gym',
                description: 'Weight lifting and cardio',
                category: 'exercise',
                priority: 4,
                is_recurring: true,
                recurrence_days: 'Mon,Wed,Fri',
                start_time: '06:00',
                end_time: '07:00'
            },
            // AI Study Session
            {
                title: 'Study AI Agents',
                description: 'Read the latest research papers',
                category: 'study',
                priority: 4,
                due_datetime: nextWeek.toISOString(),
                estimated_duration_minutes: 120, // Requires 2 hours of free time
                checklist: [{text: 'Read ReAct paper'}, {text: 'Implement simple agent'}]
            },
            // Groceries
            {
                title: 'Weekly Groceries',
                description: 'Buy food for the week',
                category: 'personal',
                priority: 3,
                due_datetime: nextWeek.toISOString(),
                estimated_duration_minutes: 60,
                checklist: [{text: 'Veggies'}, {text: 'Chicken'}, {text: 'Milk'}, {text: 'Coffee'}]
            }
        ];

        console.log('Inserting tasks...');
        for (const task of tasks) {
            const res = await post(`${API_URL}/tasks`, task, token);
            if (res.status === 201) console.log(`Created Task: ${task.title}`);
            else console.log(`Failed Task ${task.title}:`, res.status, res.data);
        }

        console.log('Generating Schedule...');
        const genRes = await post(`${API_URL}/schedule/generate-week`, { startDate: now.toISOString() }, token);
        if (genRes.status === 200) {
            console.log('Schedule generated successfully!');
        } else {
            console.log('Scheduler Failed:', genRes.status, genRes.data);
        }

        console.log('--- Test Completed ---');
    } catch (e) {
        console.error('Error during test:', e);
    }
}

runTest();
