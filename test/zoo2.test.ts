
describe('MyTest', () => {

    before(function () {
    });

    it('send messages', async () => {

        interface WebSocketMessage {
            type: string;
            data: any;
        }

        const socket = new WebSocket('ws://localhost:3400');

        socket.addEventListener('message', (event) => {
            const message: WebSocketMessage = JSON.parse(event.data);
            console.log('Received message:', message);

            if (message.type === 'greeting') {
                console.log('Server says:', message.data);
            }
        });

        socket.addEventListener('open', () => {
            const message: WebSocketMessage = {
                type: 'greeting',
                data: 'Hello, server!',
            };
            socket.send(JSON.stringify(message));
        });
    })
})
