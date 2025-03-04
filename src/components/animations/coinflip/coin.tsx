import  { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';

// Функции плавности (easing functions) для более реалистичных анимаций
// const easeOutQuart = (x: number): number => 1 - Math.pow(1 - x, 4);
const easeOutBack = (x: number): number => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
/* const easeOutBounce = (x: number): number => {
    const n1 = 7.5625;
    const d1 = 2.75;
    
    if (x < 1 / d1) {
        return n1 * x * x;
    } else if (x < 2 / d1) {
        return n1 * (x -= 1.5 / d1) * x + 0.75;
    } else if (x < 2.5 / d1) {
        return n1 * (x -= 2.25 / d1) * x + 0.9375;
    } else {
        return n1 * (x -= 2.625 / d1) * x + 0.984375;
    }
}; */

export const Coin = ({isWin, side}: {isWin: boolean, side: boolean}) => {
    const coinRef = useRef<THREE.Group>(null);
    // const materialRef = useRef<THREE.MeshStandardMaterial[]>([]);
    const [rotation, setRotation] = useState(0);
    const [animationStartTime, setAnimationStartTime] = useState<number | null>(null);
    const [animationComplete, setAnimationComplete] = useState(false);
    
    // Загружаем текстуры для сторон монеты
    const tonTexture = useTexture('/ton_symbol.svg');
    const notTexture = useTexture('/not_symbol.svg');
    
    // Настраиваем текстуры
    useEffect(() => {
        [tonTexture, notTexture].forEach(texture => {
            texture.flipY = false; // Исправляем ориентацию текстуры
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(0.7, 0.7);
            texture.offset.set(0.15, 0.15);
        });
    }, [tonTexture, notTexture]);
    
    // Начало анимации когда приходит результат
    useEffect(() => {
        if (isWin !== undefined && animationStartTime === null) {
            setAnimationStartTime(Date.now());
            setAnimationComplete(false);
            
            
            const finalRotation = Math.PI * (2 * 5 + (isWin ? 0 : 1) - (side ? 1 : 0));//не трогать ничего
            setRotation(finalRotation);
        }
    }, [isWin, side]);
    
    // Анимация вращения и подбрасывания
    useFrame(() => {
        if (!coinRef.current) return;
        
        // Если есть результат и запущена анимация
        if (isWin !== undefined && animationStartTime !== null) {
            const elapsedTime = (Date.now() - animationStartTime) / 1000; // время в секундах
            const animationDuration = 3.0; // увеличиваем длительность анимации для более плавного эффекта
            
            if (elapsedTime < animationDuration) {
                // Нормализованный прогресс анимации (от 0 до 1)
                const rawProgress = Math.min(1, elapsedTime / animationDuration);
                
                // Применяем функцию плавности для более реалистичного движения
                // const jumpEased = easeOutQuart(rawProgress);
                
                // Высота подбрасывания с разными характеристиками на разных этапах
                let jumpHeight;
                
                if (rawProgress < 0.7) {
                    // Основное подбрасывание - парабола вверх и вниз 
                    // Масштабируем, чтобы завершить до 70% анимации
                    const adjustedProgress = rawProgress / 0.7;
                    jumpHeight = 3.5 * Math.sin(adjustedProgress * Math.PI);
                } else {
                    // Эффект "пружинистого" приземления в последние 30% анимации
                    const bounceProgress = (rawProgress - 0.7) / 0.3; // нормализуем оставшуюся часть
                    // Добавляем затухающие отскоки
                    jumpHeight = 0.3 * Math.sin(bounceProgress * Math.PI * 3) * (1 - bounceProgress);
                }
                
                coinRef.current.position.y = jumpHeight;
                
                // Вращение монеты во время полета - быстрее вначале, медленнее в конце
                const rotationEased = easeOutBack(Math.min(1, rawProgress * 1.2));
                coinRef.current.rotation.x = rotation * rotationEased;
                
                // Добавляем небольшое вращение по оси Z для реалистичности,
                // сильнее в начале и меньше в конце
                const wobbleFactor = Math.max(0, 1 - rawProgress * 2); // постепенно уменьшается до 0
                coinRef.current.rotation.z = Math.sin(rawProgress * Math.PI * 8) * 0.2 * wobbleFactor;
            } else {
                // Анимация завершена - финальное положение с небольшим покачиванием
                const overshootTime = elapsedTime - animationDuration;
                // Затухающее покачивание после приземления
                const settleFactor = Math.exp(-overshootTime * 3) * 0.05;
                const settleWobble = Math.sin(overshootTime * 10) * settleFactor;
                
                coinRef.current.position.y = 0;
                coinRef.current.rotation.x = rotation + settleWobble * 0.1;
                coinRef.current.rotation.z = settleWobble;
                
                if (!animationComplete && overshootTime > 1) {
                    setAnimationComplete(true);
                }
            }
        } else {
            // Если нет результата - просто медленное вращение на месте
            coinRef.current.rotation.y += 0.01;
            
            // Небольшое покачивание для эффекта "парения"
            const hoverTime = Date.now() / 1000;
            coinRef.current.position.y = Math.sin(hoverTime) * 0.1;
            coinRef.current.rotation.z = Math.sin(hoverTime * 0.5) * 0.05;
        }
    });
    
    // Создаем материалы без текстур
    const edgeMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#000'),
        metalness: 0.9,
        roughness: 0.1,
    });
    
    // Материал для стороны TON (без текстуры)
    const tonMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#0088cc'),
        metalness: 0.7,
        roughness: 0.2,
    });
    
    // Материал для текстуры TON
    const tonTextureMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#FFFFFF'),  // Белый цвет, чтобы не искажать текстуру
        metalness: 0.5,
        roughness: 0.3,
        map: tonTexture,
        transparent: true,
        opacity: 0.95,
    });
    
    // Материал для стороны NOT (без текстуры)
    const notMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#666666'),
        metalness: 0.7,
        roughness: 0.2,
    });
    
    // Материал для текстуры NOT
    const notTextureMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#FFFFFF'),  // Белый цвет, чтобы не искажать текстуру
        metalness: 0.5,
        roughness: 0.3,
        map: notTexture,
        transparent: true,
        opacity: 0.95,
    });
    
    return (
        <group ref={coinRef} position={[0, 0, 0]} rotation={[0, 0, 0]} scale={[1, 1, 1]}>
            {/* Тело монеты - цилиндр */}
            <mesh>
                <cylinderGeometry args={[1, 1, 0.15, 64]} />
                <meshStandardMaterial {...edgeMaterial} />
            </mesh>
            
            {/* Верхняя сторона монеты - основа */}
            <mesh position={[0, 0.08, 0]} rotation={[Math.PI*3/2, 0, 0]}>
                <circleGeometry args={[0.99, 64]} />
                <meshStandardMaterial {...tonMaterial} />
            </mesh>
            
            {/* Верхняя сторона монеты - текстура */}
            <mesh position={[0, 0.081, 0]} rotation={[Math.PI*3/2, 0, 0]}>
                <circleGeometry args={[0.85, 64]} />
                <meshStandardMaterial {...tonTextureMaterial} />
            </mesh>
            
            {/* Нижняя сторона монеты - основа */}
            <mesh position={[0, -0.08, 0]} rotation={[Math.PI/2, 0, 0]}>
                <circleGeometry args={[0.99, 64]} />
                <meshStandardMaterial {...notMaterial} />
            </mesh>
            
            {/* Нижняя сторона монеты - текстура */}
            <mesh position={[0, -0.081, 0]} rotation={[Math.PI/2, 0, 0]}>
                <circleGeometry args={[0.85, 64]} />
                <meshStandardMaterial {...notTextureMaterial} />
            </mesh>

            {/* Улучшенное освещение */}
            <ambientLight intensity={0.4} />
            
            {/* Направленный свет спереди */}
            <directionalLight 
                position={[5, 5, 5]} 
                intensity={0.7} 
                color="#FFFFFF" 
            />
            
            {/* Направленный свет сзади для объема */}
            <directionalLight 
                position={[-5, -2, -5]} 
                intensity={0.4} 
                color="#AACCFF" 
            />
            
            {/* Боковые светильники для подчеркивания краев */}
            <pointLight 
                position={[3, 0, 0]} 
                intensity={0.3} 
                color="#FFFFFF" 
                distance={10}
            />
            
            <pointLight 
                position={[-3, 0, 0]} 
                intensity={0.3} 
                color="#FFFFFF" 
                distance={10}
            />
        </group>
    );
};

