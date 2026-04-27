pipeline {
    agent any

    stages {
        stage('Install Dependencies') {
            steps {
                sh 'npm install'
            }
        }

        stage('Build') {
            steps {
                sh 'npm run build'
            }
        }

        stage('Test') {
            steps {
                sh 'npm test'
            }
        }

        stage('Code Quality') {
            steps {
                withCredentials([string(credentialsId: '7.3HD_sonar-token', variable: 'SONAR_TOKEN')]) {
                    sh 'npm run sonar -- -Dsonar.token=$SONAR_TOKEN'
                }
            }
        }

        stage('Security Scan') {
            steps {
                sh 'npm run security || true'
            }
        }

	stage('Deploy to Test') {
	    steps {
	        sh '''
	        docker stop batfit-test || true
	        docker rm batfit-test || true
	        docker ps -q --filter "publish=3000" | xargs -r docker stop
	        docker build -t batfit-app:${BUILD_NUMBER} .
	        docker run -d -p 3000:3000 --name batfit-test batfit-app:${BUILD_NUMBER}
	        '''
	    }
	}
        stage('Release to Production') {
            steps {
                echo 'Production release is handled by Render auto-deploy from the devops-hd-pipeline branch.'
                echo 'Render production URL: https://batfit-devops.onrender.com'
            }
        }

	stage('Monitoring and Alerting') {
	    steps {
	        withCredentials([string(credentialsId: 'uptimerobot-api-key', variable: 'UPTIMEROBOT_API_KEY')]) {
	            sh '''
	            echo "Checking UptimeRobot monitor status for production..."
	            RESPONSE=$(curl -s -X POST https://api.uptimerobot.com/v2/getMonitors \
	              -H "Content-Type: application/x-www-form-urlencoded" \
	              -d "api_key=$UPTIMEROBOT_API_KEY" \
	              -d "format=json" \
	              -d "search=batfit-devops.onrender.com")
	
	            echo "$RESPONSE"

	            echo "$RESPONSE" | grep '"status":2' || {
	              echo "ALERT: UptimeRobot reports production monitor is not UP"
	              exit 1
	            }
	
	            echo "Production monitor is UP in UptimeRobot"
	            '''
	        }
	    }
	}
    }
}
