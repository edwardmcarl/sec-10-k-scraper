from pickle import ADDITEMS
import zerorpc

class Counter:
    
    count = 0
    
    def increment()-> int:
        count = count + 1
        return count

BIND_ADDRESS = 'tcp://localhost:55555'

def main():
    s = zerorpc.Server(Counter())
    s.bind(BIND_ADDRESS)
    print("running")
    s.run()
    
    
if __name__ == '__main__':
    main()
