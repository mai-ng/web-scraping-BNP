# webscrapingBNP
Web Scraping BNP Paris Demo website for data of an account 

Goal
--------
Create a service that collects all data from the following demo account: 
https://mabanque.bnpparibas/sitedemo/ident.html

The service takes in parameters:
- the customer number
- the secret code

The service returns for each account in the form of a JSON that you will define:
- the name of the account
- the account number
- the current balance
- the balance to come

Technical stack
---------------
PhantomJS
