const express = require("express");
const app = express();
const Sequelize = require("sequelize");
const cors = require("cors");

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

// Database connection configuration
const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "./database.sqlite", // SQLite database file
  logging: false // Disable logging (optional)
});

// Model: Author
const Autor = sequelize.define("Autor", {
  idautor: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nombre: {
    type: Sequelize.STRING,
    allowNull: false
  },
  biografia: {
    type: Sequelize.TEXT,
  },
  urlfoto: {
    type: Sequelize.STRING,
  },
});

// Model: Anthology
const Antologia = sequelize.define("Antologia", {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  titulo: {
    type: Sequelize.STRING,
    allowNull: false
  },
  idautor: {
    type: Sequelize.INTEGER,
    references: {
      model: Autor,
      key: "idautor",
    },
  },
  contenido: {
    type: Sequelize.TEXT,
  },
  referencia: {
    type: Sequelize.STRING,
  },
  tituloObra: {
    type: Sequelize.STRING,
  },
  autorObra: {
    type: Sequelize.STRING,
  },
});

// Model: Likes
const Like = sequelize.define("Like", {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  idantologia: {
    type: Sequelize.INTEGER,
    references: {
      model: Antologia,
      key: 'id',
    }
  },
  userId: {
    type: Sequelize.STRING,
  },
  userEmail: {
    type: Sequelize.STRING,
  }
});

// Relationships
Antologia.belongsTo(Autor, { foreignKey: "idautor" });
Autor.hasMany(Antologia, { foreignKey: "idautor" });

Like.belongsTo(Antologia, { foreignKey: 'idantologia' });
Antologia.hasMany(Like, { foreignKey: 'idantologia' });

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  preflightContinue: false,
  optionsSuccessStatus: 204,
}));

// Database Initialization Function
async function initializeDatabase() {
  try {
    // Sync models with database
    await sequelize.sync({ alter: true });
    console.log('Database and tables synchronized successfully');

    // Check and create default author if none exists
    const autorCount = await Autor.count();
    if (autorCount === 0) {
      await Autor.create({
        nombre: "Ada Aurora Sánchez Peña",
        biografia: "Investigadora y académica de la Universidad de Colima",
        urlfoto: "https://example.com/default-author-image.png"
      });
      console.log('Default author created');
    }

    // Check and create default anthology if none exists
    const antologiaCount = await Antologia.count();
    if (antologiaCount === 0) {
      const defaultAuthor = await Autor.findOne();
      if (defaultAuthor) {
        await Antologia.create({
          titulo: "Primera Antología",
          idautor: defaultAuthor.idautor,
          contenido: "Contenido de ejemplo de la primera antología",
          referencia: "Referencia de ejemplo",
          tituloObra: "Obra de ejemplo",
          autorObra: "Autor de la obra de ejemplo"
        });
        console.log('Default anthology created');
      }
    }
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Anthology Endpoints
// Create new anthology
app.post("/antologia", async (req, res) => {
  try {
    const antologia = await Antologia.create(req.body);
    res.status(201).json(antologia);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update anthology
app.put("/antologia/:id", async (req, res) => {
  try {
    const [updated] = await Antologia.update(req.body, {
      where: { id: req.params.id }
    });
    
    if (updated) {
      const updatedAntologia = await Antologia.findByPk(req.params.id);
      return res.json(updatedAntologia);
    }
    
    throw new Error('Anthology not found');
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete anthology
app.delete("/antologia/:id", async (req, res) => {
  try {
    const deleted = await Antologia.destroy({
      where: { id: req.params.id }
    });
    
    if (deleted) {
      return res.json({ message: "Anthology deleted successfully" });
    }
    
    throw new Error('Anthology not found');
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all anthologies with author details
app.get("/antologia", async (req, res) => {
  try {
    const antologias = await Antologia.findAll({
      include: {
        model: Autor,
        attributes: ["nombre", "biografia", "urlfoto"]
      },
      attributes: {
        include: [
          [
            sequelize.literal('(SELECT COUNT(*) FROM Likes WHERE Likes.idantologia = Antologia.id)'),
            'likesCount'
          ]
        ]
      }
    });

    if (!antologias || antologias.length === 0) {
      return res.status(404).json({ message: "No anthologies found" });
    }

    res.status(200).json(antologias);
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Author Endpoints
// Get all authors
app.get("/autores", async (req, res) => {
  try {
    const autores = await Autor.findAll();
    res.status(200).json(autores);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new author
app.post("/autores", async (req, res) => {
  try {
    const autor = await Autor.create(req.body);
    res.status(201).json(autor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update author
app.put("/autores/:id", async (req, res) => {
  try {
    const [updated] = await Autor.update(req.body, {
      where: { idautor: req.params.id }
    });
    
    if (updated) {
      const updatedAutor = await Autor.findByPk(req.params.id);
      return res.json(updatedAutor);
    }
    
    throw new Error('Author not found');
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Like Endpoints
// Add a like
app.post("/like", async (req, res) => {
  try {
    const like = await Like.create(req.body);
    res.status(201).json(like);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get likes for an anthology
app.get("/like/:idantologia", async (req, res) => {
  try {
    const likes = await Like.findAll({
      where: { idantologia: req.params.idantologia }
    });
    res.status(200).json(likes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
initializeDatabase().then(() => {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server started on port ${PORT}`);
  });
}).catch(error => {
  console.error('Failed to initialize database:', error);
});

module.exports = app; // For potential testing