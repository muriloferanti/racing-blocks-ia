// Car Class


const carImage = new Image();
carImage.src = 'car.png';

const blockImage = new Image();
blockImage.src = 'block.png';

class Car {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 50;
        this.height = 100;
        this.speed = 5;
    }

    draw(ctx) {
        ctx.drawImage(carImage, this.x, this.y, this.width, this.height);
    }

    move(direction) {
        if (direction === "left" && this.x > 0) {
            this.x -= this.speed;
        } else if (direction === "right" && this.x < 800 - this.width) {
            this.x += this.speed;
        }
    }

    getVisionArea() {
        return {
            x1: this.x - 75,  // 75 pixels à esquerda do carro
            y1: this.y - 75,  // 75 pixels acima do carro
            x2: this.x + this.width + 75,  // 75 pixels à direita do carro
            y2: this.y + this.height + 75  // 75 pixels abaixo do carro
        };
    }

    drawVisionArea(ctx) {
        const visionArea = this.getVisionArea();
        ctx.strokeStyle = "rgba(0, 255, 0, 0.5)";
        ctx.lineWidth = 2;
        ctx.strokeRect(visionArea.x1, visionArea.y1, visionArea.x2 - visionArea.x1, visionArea.y2 - visionArea.y1);
    }
}



// Function to save and load cones positions
function saveCones(cones) {
    localStorage.setItem("cones", JSON.stringify(cones));
}

function loadCones() {
    const savedCones = localStorage.getItem("cones");
    return savedCones ? JSON.parse(savedCones) : [];
}

function canAddCone(cones, newCone, visionArea) {
    for (let cone of cones) {
        if (cone.y > newCone.y && 
            cone.x < newCone.x + 20 && 
            cone.x + 20 > newCone.x &&
            cone.y - visionArea.y2 < visionArea.y2) {
            return false; // Cone já está muito próximo
        }
    }
    return true; // Pode adicionar o cone
}

function saveScore(score) {
    let scores = localStorage.getItem("scores");
    scores = scores ? JSON.parse(scores) : [];
    scores.push(score);
    localStorage.setItem("lastScore", score);
    localStorage.setItem("scores", JSON.stringify(scores));
}

function loadScores() {
    let scores = localStorage.getItem("scores");
    return scores ? JSON.parse(scores) : [];
}

let showVisionArea = true; // Flag para controlar se a área de visão deve ser desenhada
document.getElementById("toggleVision").addEventListener("click", function() {
    showVisionArea = !showVisionArea; // Inverte o estado do flag
});



// Main Async Function
async function main() {
    loadQTable();

    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const car = new Car(375, 500);
    let score = 0;
    let coneSpeed = 4

    document.addEventListener("keydown", (event) => {
        if (event.key === "ArrowLeft") {
            car.move("left");
        } else if (event.key === "ArrowRight") {
            car.move("right");
        }
    });

    let prevState = null;
    let prevAction = null;
    let currentState = [car.x];
    let reward = 0;
    let cones = loadCones();

    while (true) {
        await new Promise(resolve => setTimeout(resolve, 1000 / 60));

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Desenha os cones
        for (let cone of cones) {
            cone.y += coneSpeed;
            ctx.drawImage(blockImage, cone.x, cone.y, 20, 20);
        }

        // Desenha o carro
        car.draw(ctx);
        if (showVisionArea) {
            car.drawVisionArea(ctx); // Desenha a área de visão do carro se showVisionArea for verdadeiro
        }

        // Adiciona novos cones aleatoriamente
        if (cones.length < 5 && Math.random() < 0.04) {
            let newCone = { x: Math.random() * (canvas.width - 50), y: 0 };
    
            // Verificar se pode adicionar o cone com base no espaçamento
            if (canAddCone(cones, newCone, car.getVisionArea())) {
                cones.push(newCone);
                saveCones(cones); // Save cones positions to localStorage
            }
        }

        // Verifica a colisão com os cones
        for (let cone of cones) {
            const visionArea = car.getVisionArea();
     
            if (cone.x >= visionArea.x1 && cone.x + 20 <= visionArea.x2 &&
                cone.y >= visionArea.y1 && cone.y + 20 <= visionArea.y2) {
                
                const visionCenterX = visionArea.x1 + (visionArea.x2 - visionArea.x1) / 2;
                const visionCenterY = visionArea.y1 + (visionArea.y2 - visionArea.y1) / 2;
                const coneCenterX = cone.x + 10;
                const coneCenterY = cone.y + 10;
        
                // Calcular a distância entre o centro da visão e o centro do cone
                const distance = Math.sqrt(
                    Math.pow(visionCenterX - coneCenterX, 2) + 
                    Math.pow(visionCenterY - coneCenterY, 2)
                );
        
                // Definir a recompensa com base na distância
                if (distance < 100) { // Se o cone estiver a menos de 100 pixels de distância
                    reward -= 1; // Recompensa negativa por estar perto do cone
                } else {
                    reward += 1; // Recompensa positiva por estar longe do cone
                }
            }

            if (car.x < cone.x + 20 &&
                car.x + car.width > cone.x &&
                car.y < cone.y + 20 &&
                car.y + car.height > cone.y) {

                saveQTable();
                
                saveScore(score);
           
                const lastScore = parseInt(localStorage.getItem("lastScore"), 10) || 0; // Pega o último score salvo

                if (score === lastScore) {
                    localStorage.removeItem("cones"); // Limpa os cones do localStorage
                }

                setTimeout(() => {
                    document.location.reload();
                }, 500);
                
                return;
            }
        }

        // Remove cones fora da tela
        cones = cones.filter(cone => cone.y <= canvas.height);

        currentState = [car.x];
        let action = chooseAction(currentState, cones);
        
        if (action === "left") {
            car.move("left");
        } else {
            car.move("right");
        }

        if (prevState !== null) {
            updateQValue(prevState, prevAction, currentState, reward);
        }

        prevState = currentState;
        prevAction = action;

        score += coneSpeed;
        if (score % 300 === 0 && score !== 0) {
            coneSpeed += 1; // Aumentar a velocidade dos cones
        }
        ctx.fillStyle = "black";
        ctx.font = "20px Arial";
        ctx.fillText("Score: " + score, 10, 30);

        document.getElementById("rewardDisplay").innerText = "Reward: " + reward

        const scores = loadScores();
        ctx.fillText("High Scores:", 650, 30);
        for (let i = 0; i < scores.length && i < 5; i++) {
            ctx.fillText(scores[i], 650, 60 + i * 30);
        }
    }
}

// Start the game
main().catch(console.error);