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

	stage('Deploy') {
	    steps {
	        sh 'docker build -t batfit-app:${BUILD_NUMBER} .'
	        sh 'docker stop batfit-container || true'
	        sh 'docker rm batfit-container || true'
	        sh 'docker run -d -p 3000:3000 --name batfit-container batfit-app'
	    }
	}

	stage('Release') {
	    steps {
	        sh 'docker tag batfit-app:${BUILD_NUMBER} batfit-app:production'
	        sh 'docker stop batfit-prod || true'
	        sh 'docker rm batfit-prod || true'
	        sh 'docker run -d -p 3001:3000 --name batfit-prod batfit-app:production'
	    }
	}
    }
}
