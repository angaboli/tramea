# Guide : Intégration de Gemini pour l'analyse des programmes

Ce document explique comment configurer et utiliser l'outil Gemini pour lire (parser) automatiquement les programmes dans le projet Tramea. Les explications sont volontairement simples pour faciliter la mise en place.

## 1. Création de la clé secrète (GEMINI_API_KEY)

Pour que notre application puisse communiquer avec Gemini, elle a besoin d'une sorte de mot de passe, appelé "clé API".

**Voici les étapes à suivre :**

1. Créez votre clé depuis la plateforme Google AI Studio.
2. Dans le dossier principal de votre projet, créez un fichier nommé `.env` (si vous avez déjà un fichier `.env.example`, vous pouvez le copier et le renommer en `.env`).
3. Ouvrez ce fichier `.env` et ajoutez la ligne suivante en y collant votre vraie clé :

```text
GEMINI_API_KEY=votre_cle_secrete_ici
```

_Note : Ce fichier `.env` est strictement personnel. Il sert à protéger votre clé sur votre ordinateur et ne doit jamais être envoyé sur internet._

## 2. Lancement du projet sur votre ordinateur

Pour travailler sur le projet et tester que la liaison avec Gemini fonctionne bien, nous utilisons l'outil Vercel pour simuler l'environnement réel.

Dans votre terminal (ou ligne de commande), tapez la commande suivante :

```bash
npx vercel dev
```

Cette commande va démarrer l'application en prenant soin de lire automatiquement la clé secrète que vous avez placée dans le fichier `.env`.

## 3. Que se passe-t-il si Gemini n'est pas disponible ?

Le système est conçu pour ne jamais vous bloquer. Nous avons mis en place une solution de secours automatique (un "fallback").

- **Si la clé est présente :** L'application utilise l'intelligence de Gemini pour faire une analyse intelligente du programme.
- **Si la clé est absente (ou si le service coupe) :** Si vous n'avez pas mis de clé dans votre `.env`, l'application ne plantera pas. Elle passera instantanément sur l'analyse "normale" et classique, exactement comme elle le faisait avant l'ajout de l'IA. Vous pouvez donc continuer à travailler sans interruption.
