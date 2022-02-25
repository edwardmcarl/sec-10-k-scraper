from pickle import ADDITEMS
import zerorpc

count = 1
class Counter:
    
    
    def increment(self)-> int:
        global count
        count = count + 1
        return count
BIND_ADDRESS = 'tcp://127.0.0.1:55555'

def main():
    server = zerorpc.Server(Counter())
    server.bind(BIND_ADDRESS)
    server.run()
    
if __name__ == '__main__':
    main()
