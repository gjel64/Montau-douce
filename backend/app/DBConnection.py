import os
import psycopg2

class DBConnection:

   __instance = None
   __connection = None
    
   @staticmethod 
   def getConnection():
      if DBConnection.__instance == None:
         DBConnection(psycopg2.connect(os.environ["DATABASE_URL"]))
      return DBConnection.__connection
         
   @staticmethod
   def close(self):
      if DBConnection.__instance != None:
         DBConnection.__connection.close()
         DBConnection.__instance = None
         DBConnection.__connection = None

   def __init__(self, connection):
         if DBConnection.__instance != None:
            raise Exception("Can't instantiate a Singleton")
         else:
            DBConnection.__instance = self
            DBConnection.__connection = connection