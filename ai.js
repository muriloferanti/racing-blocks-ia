
// Inicializar tabela Q
let Q_TABLE = {};
const DISCOUNT_FACTOR = 0.9;
const LEARNING_RATE = 0.1; // Reduzindo a taxa de aprendizagem
const EXPLORATION_RATE = 0.2; // Reduzindo a taxa de exploração


// Função para obter o estado atual
function getState(car, obstacles) {
    let closestObstacle = obstacles.length > 0 ? obstacles[0] : null;
    let obstacleX = closestObstacle ? closestObstacle.x : -1;
    let obstacleY = closestObstacle ? closestObstacle.y : -1;

    // Verificar se o cone está dentro da área de visão do carro
    let isConeInView = false;
    if (closestObstacle) {
        const visionArea = car.getVisionArea();
        if (closestObstacle.x >= visionArea.x1 && closestObstacle.x + 20 <= visionArea.x2 &&
            closestObstacle.y >= visionArea.y1 && closestObstacle.y + 20 <= visionArea.y2) {
            isConeInView = true;
        }
    }

    return [car.x, obstacleX, obstacleY, isConeInView];
}


function chooseAction(state, cones) {
    if (!Q_TABLE[state]) {
        Q_TABLE[state] = {"left": 0, "right": 0};
    }

    let visionArea = [state[0] - 50, state[0] + 100]; // Ajustando o campo de visão

    let closestCone = null;
    let closestDistance = Infinity;

    // Encontrar o cone mais próximo dentro do campo de visão
    for (let cone of cones) {
        if (cone.x >= visionArea[0] && cone.x <= visionArea[1]) {
            let distance = Math.abs(state[0] - cone.x);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestCone = cone;
            }
        }
    }

    let reward = 0;

    // Cone à direita do carro
    if (closestCone && closestCone.x > state[0]) {
        reward -= 1; // Penalizar por se mover para a direita
        return "left";
    } 
    // Cone à esquerda do carro
    else if (closestCone && closestCone.x < state[0]) {
        reward -= 1; // Penalizar por se mover para a esquerda
        return "right";
    } 
    // Perto da borda esquerda
    else if (state[0] < 50) {
        reward -= 0.5; // Penalizar por se mover para a esquerda
        return "right";
    } 
    // Perto da borda direita
    else if (state[0] > 750) {
        reward -= 0.5; // Penalizar por se mover para a direita
        return "left";
    } 
    // Longe do cone
    else if (closestCone && closestDistance > 100) {
        reward += 3; // Recompensar por se mover para longe do cone
    }
    
    // Adicionando um pequeno fator de exploração mesmo quando não há obstáculos
    if (Math.random() < EXPLORATION_RATE) {
        return Math.random() < 0.5 ? "left" : "right";
    } else {
        return Q_TABLE[state]["left"] > Q_TABLE[state]["right"] ? "left" : "right";
    }
}

function updateQValue(prevState, prevAction, currentState, reward) {
    if (!Q_TABLE[currentState]) {
        Q_TABLE[currentState] = {"left": 0, "right": 0};
    }
    
    if (Q_TABLE[prevState] && Q_TABLE[prevState][prevAction] !== undefined) {
        let maxFutureQ = Math.max(Q_TABLE[currentState]["left"], Q_TABLE[currentState]["right"]);
        let newQValue = (1 - LEARNING_RATE) * Q_TABLE[prevState][prevAction] + LEARNING_RATE * (reward + DISCOUNT_FACTOR * maxFutureQ);
        Q_TABLE[prevState][prevAction] = newQValue;
    }
}
function saveQTable() {
    localStorage.setItem("Q_TABLE", JSON.stringify(Q_TABLE));
}


function loadQTable() {
    let savedQTable = localStorage.getItem("Q_TABLE");
    if (savedQTable) {
        Q_TABLE = JSON.parse(savedQTable);
    }
}